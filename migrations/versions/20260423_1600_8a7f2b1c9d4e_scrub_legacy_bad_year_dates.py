"""Scrub legacy bad-year dates in projects and bookings

Remediates rows where start_date or end_date has year in 20-30, which were
produced by the frontend date-parsing bug (year "26" parsed as year 0026
instead of 2026 by date-fns when the display format used dd.MM.yy and the
parser tried dd.MM.yyyy first). See PR #141 and 0.17.0-beta.3 changelog.

Safety features:
- Pre-flight check rejects any row with a year outside the expected
  {20..30, 2020..2100} set. Such rows do not match the known bug and
  need manual review before this migration and the follow-up CHECK
  constraint migration can run.
- Scrub range narrowed to year 20..30 (matches the early-2026 bug window).
- Before UPDATE, affected rows are snapshotted into a dedicated audit
  table `_scrub_8a7f2b1c9d4e_audit` with an index on (table_name, row_id)
  so downgrade can restore exactly the rows that were modified.
- Single atomic UPDATE per table, joined to the audit table by id, so
  the scrub touches exactly the snapshotted rows.
- Per-row lines logged via Python logging to Alembic's migration logger.
- lock_timeout/statement_timeout guards against indefinite blocking if a
  concurrent transaction holds a row lock.
- DROP TABLE IF EXISTS guard at the top handles the edge case where a
  prior run partially succeeded under an autocommit-DDL Alembic config
  and left an orphan audit table behind.

Revision ID: 8a7f2b1c9d4e
Revises: fa64e7c900f3
Create Date: 2026-04-23 16:00:00.000000+00:00

"""

import logging
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine import Connection

revision: str = '8a7f2b1c9d4e'
down_revision: Union[str, None] = 'fa64e7c900f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


AFFECTED_TABLES = ('projects', 'bookings')
AUDIT_TABLE = '_scrub_8a7f2b1c9d4e_audit'
BUG_YEAR_MIN = 20
BUG_YEAR_MAX = 30

log = logging.getLogger('alembic.runtime.migration')


def _preflight_reject_unknown_bad_years(conn: Connection) -> None:
    """Fail fast on rows whose years do not match the expected signature.

    Expected: year in [20, 30] (the bug) or [2020, 2100] (valid). Anything
    else — year 0..19, 31..99, 100..2019, or > 2100 — needs manual review.
    """
    for table in AFFECTED_TABLES:
        result = conn.execute(
            sa.text(
                f"""
                SELECT COUNT(*) FROM {table}
                WHERE (
                    EXTRACT(YEAR FROM start_date) NOT BETWEEN {BUG_YEAR_MIN} AND {BUG_YEAR_MAX}
                    AND EXTRACT(YEAR FROM start_date) NOT BETWEEN 2020 AND 2100
                ) OR (
                    EXTRACT(YEAR FROM end_date) NOT BETWEEN {BUG_YEAR_MIN} AND {BUG_YEAR_MAX}
                    AND EXTRACT(YEAR FROM end_date) NOT BETWEEN 2020 AND 2100
                )
                """
            )
        )
        count = result.scalar() or 0
        if count:
            raise RuntimeError(
                f'{table} has {count} row(s) with year outside the expected '
                f'set (bug window {BUG_YEAR_MIN}..{BUG_YEAR_MAX} or valid '
                '2020..2100). Review manually before running this migration.'
            )


def _snapshot_and_scrub(conn: Connection, table: str) -> int:
    """Snapshot affected rows into audit table then scrub in one UPDATE.

    Returns the number of rows snapshotted.
    """
    affected = conn.execute(
        sa.text(
            f"""
            INSERT INTO {AUDIT_TABLE}
                (table_name, row_id, old_start_date, old_end_date)
            SELECT :table_name, id, start_date, end_date
            FROM {table}
            WHERE EXTRACT(YEAR FROM start_date) BETWEEN {BUG_YEAR_MIN} AND {BUG_YEAR_MAX}
               OR EXTRACT(YEAR FROM end_date)   BETWEEN {BUG_YEAR_MIN} AND {BUG_YEAR_MAX}
            RETURNING row_id, old_start_date, old_end_date
            """
        ),
        {'table_name': table},
    ).fetchall()

    for row in affected:
        log.info(
            '[scrub %s] id=%s old_start=%s old_end=%s',
            table,
            row.row_id,
            row.old_start_date,
            row.old_end_date,
        )

    conn.execute(
        sa.text(
            f"""
            UPDATE {table} AS t
            SET
                start_date = CASE
                    WHEN EXTRACT(YEAR FROM t.start_date) BETWEEN {BUG_YEAR_MIN} AND {BUG_YEAR_MAX}
                    THEN t.start_date + INTERVAL '2000 years'
                    ELSE t.start_date
                END,
                end_date = CASE
                    WHEN EXTRACT(YEAR FROM t.end_date) BETWEEN {BUG_YEAR_MIN} AND {BUG_YEAR_MAX}
                    THEN t.end_date + INTERVAL '2000 years'
                    ELSE t.end_date
                END
            FROM {AUDIT_TABLE} AS a
            WHERE a.table_name = :table_name AND a.row_id = t.id
            """
        ),
        {'table_name': table},
    )

    return len(affected)


def upgrade() -> None:
    conn = op.get_bind()
    # Clean up an orphaned audit table from a previously-failed autocommit run.
    conn.execute(sa.text(f'DROP TABLE IF EXISTS {AUDIT_TABLE}'))

    conn.execute(sa.text("SET LOCAL lock_timeout = '10s'"))
    conn.execute(sa.text("SET LOCAL statement_timeout = '60s'"))

    _preflight_reject_unknown_bad_years(conn)

    op.create_table(
        AUDIT_TABLE,
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('table_name', sa.Text(), nullable=False),
        sa.Column('row_id', sa.Integer(), nullable=False),
        sa.Column('old_start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('old_end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            'scrubbed_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('NOW()'),
        ),
    )
    op.create_index(
        f'ix_{AUDIT_TABLE}_lookup',
        AUDIT_TABLE,
        ['table_name', 'row_id'],
    )

    for table in AFFECTED_TABLES:
        count = _snapshot_and_scrub(conn, table)
        log.info('[scrub %s] remediated %d row(s)', table, count)


def downgrade() -> None:
    """Restore pre-scrub dates using the audit table.

    Touches only rows recorded in the audit table, keyed by
    (table_name, row_id). Rows written after the migration ran are
    untouched. Emits a warning if the audit count no longer matches the
    expected scrubbed-row count, which can happen if someone deleted
    audit rows manually.
    """
    conn = op.get_bind()
    conn.execute(sa.text("SET LOCAL lock_timeout = '10s'"))
    conn.execute(sa.text("SET LOCAL statement_timeout = '60s'"))

    for table in AFFECTED_TABLES:
        audit_count = (
            conn.execute(
                sa.text(f'SELECT COUNT(*) FROM {AUDIT_TABLE} WHERE table_name = :t'),
                {'t': table},
            ).scalar()
            or 0
        )
        scrubbed_count = (
            conn.execute(
                sa.text(
                    f"""
                SELECT COUNT(*) FROM {table}
                WHERE EXTRACT(YEAR FROM start_date) BETWEEN 2020 AND 2030
                   OR EXTRACT(YEAR FROM end_date)   BETWEEN 2020 AND 2030
                """
                )
            ).scalar()
            or 0
        )
        if audit_count > scrubbed_count:
            log.warning(
                '[scrub downgrade %s] audit has %d rows but only %d still '
                'match the scrubbed-year window. Some audit rows may refer '
                'to data that changed; downgrade will restore what it can.',
                table,
                audit_count,
                scrubbed_count,
            )

        conn.execute(
            sa.text(
                f"""
                UPDATE {table} AS t
                SET start_date = a.old_start_date,
                    end_date   = a.old_end_date
                FROM {AUDIT_TABLE} AS a
                WHERE a.table_name = :table_name
                  AND a.row_id = t.id
                """
            ),
            {'table_name': table},
        )

    op.drop_index(f'ix_{AUDIT_TABLE}_lookup', table_name=AUDIT_TABLE)
    op.drop_table(AUDIT_TABLE)
