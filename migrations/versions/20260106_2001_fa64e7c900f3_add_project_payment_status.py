"""Add payment_status column to projects table

Revision ID: fa64e7c900f3
Revises: ca195814c916
Create Date: 2026-01-06 20:01:00.000000+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'fa64e7c900f3'
down_revision: Union[str, None] = 'ca195814c916'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the projectpaymentstatus ENUM type
    projectpaymentstatus = sa.Enum(
        'UNPAID',
        'PARTIALLY_PAID',
        'PAID',
        name='projectpaymentstatus',
    )
    projectpaymentstatus.create(op.get_bind(), checkfirst=True)

    # Add payment_status column to projects table
    op.add_column(
        'projects',
        sa.Column(
            'payment_status',
            sa.Enum(
                'UNPAID',
                'PARTIALLY_PAID',
                'PAID',
                name='projectpaymentstatus',
            ),
            server_default='UNPAID',
            nullable=False,
        ),
    )

    # Create index on payment_status
    op.create_index(
        op.f('ix_projects_payment_status'),
        'projects',
        ['payment_status'],
        unique=False,
    )


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_projects_payment_status'), table_name='projects')

    # Drop column
    op.drop_column('projects', 'payment_status')

    # Drop ENUM type
    sa.Enum(name='projectpaymentstatus').drop(op.get_bind(), checkfirst=True)
