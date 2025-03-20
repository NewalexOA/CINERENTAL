"""add_scan_sessions

Revision ID: 2a58625a591b
Revises: 00b8019900d4
Create Date: 2025-03-20 15:10:49.283384+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2a58625a591b'
down_revision: Union[str, None] = '00b8019900d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add equipment_scan_sessions table."""
    op.create_table(
        'equipment_scan_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('items', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_equipment_scan_sessions_created_at'),
        'equipment_scan_sessions',
        ['created_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_equipment_scan_sessions_updated_at'),
        'equipment_scan_sessions',
        ['updated_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_equipment_scan_sessions_user_id'),
        'equipment_scan_sessions',
        ['user_id'],
        unique=False,
    )


def downgrade() -> None:
    """Remove equipment_scan_sessions table."""
    op.drop_index(
        op.f('ix_equipment_scan_sessions_user_id'), table_name='equipment_scan_sessions'
    )
    op.drop_index(
        op.f('ix_equipment_scan_sessions_updated_at'),
        table_name='equipment_scan_sessions',
    )
    op.drop_index(
        op.f('ix_equipment_scan_sessions_created_at'),
        table_name='equipment_scan_sessions',
    )
    op.drop_table('equipment_scan_sessions')
