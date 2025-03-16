"""remove_unique_serial_number

Revision ID: ce486ea5be90
Revises: 30ff09a53c19
Create Date: 2025-03-16 20:44:22.016157+00:00

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'ce486ea5be90'
down_revision: Union[str, None] = '30ff09a53c19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove unique constraint from equipment.serial_number field."""
    # Drop the unique index on the serial_number column
    op.drop_index('ix_equipment_serial_number', table_name='equipment')

    # Create a new non-unique index
    op.create_index(
        op.f('ix_equipment_serial_number'), 'equipment', ['serial_number'], unique=False
    )


def downgrade() -> None:
    """Restore unique constraint to equipment.serial_number field."""
    # Drop the non-unique index
    op.drop_index('ix_equipment_serial_number', table_name='equipment')

    # Recreate the unique index
    op.create_index(
        op.f('ix_equipment_serial_number'), 'equipment', ['serial_number'], unique=True
    )
