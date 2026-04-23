"""Add year-range CHECK constraints on project and booking date columns

Enforces year range 2020-2100 at the database level as defense in depth
against application-layer bypasses. Must run after the legacy data scrub
migration (8a7f2b1c9d4e) or VALIDATE CONSTRAINT will fail on existing rows.

Uses the NOT VALID + VALIDATE CONSTRAINT pattern:
- ADD CONSTRAINT ... NOT VALID takes AccessExclusiveLock briefly for the
  catalog write only; does not scan existing rows.
- VALIDATE CONSTRAINT then scans rows under ShareUpdateExclusiveLock,
  which allows concurrent reads and writes.

Revision ID: b9c3e4f2a6d8
Revises: 8a7f2b1c9d4e
Create Date: 2026-04-23 16:01:00.000000+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b9c3e4f2a6d8'
down_revision: Union[str, None] = '8a7f2b1c9d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONSTRAINTS = (
    ('projects', 'start_date'),
    ('projects', 'end_date'),
    ('bookings', 'start_date'),
    ('bookings', 'end_date'),
)


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("SET LOCAL lock_timeout = '10s'"))
    conn.execute(sa.text("SET LOCAL statement_timeout = '60s'"))

    for table, column in CONSTRAINTS:
        name = f'{table}_{column}_year_chk'
        op.execute(
            f'ALTER TABLE {table} ADD CONSTRAINT {name} '
            f'CHECK (EXTRACT(YEAR FROM {column}) BETWEEN 2020 AND 2100) '
            'NOT VALID'
        )

    for table, column in CONSTRAINTS:
        name = f'{table}_{column}_year_chk'
        op.execute(f'ALTER TABLE {table} VALIDATE CONSTRAINT {name}')


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("SET LOCAL lock_timeout = '10s'"))
    conn.execute(sa.text("SET LOCAL statement_timeout = '60s'"))

    for table, column in CONSTRAINTS:
        op.drop_constraint(
            constraint_name=f'{table}_{column}_year_chk',
            table_name=table,
            type_='check',
        )
