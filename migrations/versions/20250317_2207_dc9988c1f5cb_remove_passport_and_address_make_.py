"""remove_passport_and_address_make_contact_optional

Revision ID: dc9988c1f5cb
Revises: 2dadcbaa2fea
Create Date: 2025-03-17 22:07:24.572867+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'dc9988c1f5cb'
down_revision: Union[str, None] = '2dadcbaa2fea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column(
        'clients', 'email', existing_type=sa.VARCHAR(length=255), nullable=True
    )
    op.alter_column(
        'clients', 'phone', existing_type=sa.VARCHAR(length=20), nullable=True
    )
    op.drop_constraint('clients_passport_number_key', 'clients', type_='unique')
    op.drop_column('clients', 'passport_number')
    op.drop_column('clients', 'address')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        'clients',
        sa.Column(
            'address', sa.VARCHAR(length=500), autoincrement=False, nullable=False
        ),
    )
    op.add_column(
        'clients',
        sa.Column(
            'passport_number',
            sa.VARCHAR(length=20),
            autoincrement=False,
            nullable=False,
        ),
    )
    op.create_unique_constraint(
        'clients_passport_number_key', 'clients', ['passport_number']
    )
    op.alter_column(
        'clients', 'phone', existing_type=sa.VARCHAR(length=20), nullable=False
    )
    op.alter_column(
        'clients', 'email', existing_type=sa.VARCHAR(length=255), nullable=False
    )
    # ### end Alembic commands ###
