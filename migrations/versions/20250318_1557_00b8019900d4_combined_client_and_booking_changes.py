"""combined_client_and_booking_changes

Revision ID: 00b8019900d4
Revises: ce486ea5be90
Create Date: 2025-03-18 15:57:24.990969+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '00b8019900d4'
down_revision: Union[str, None] = 'ce486ea5be90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Combined upgrade operations from multiple migrations.

    This migration combines and replaces the following migrations:
    - 20250317_2125_2dadcbaa2fea_merge_first_and_last_name
    - 20250317_2207_dc9988c1f5cb_remove_passport_and_address_make_
    - 20250318_1503_0d544e3b71ec_remove_unique_constraints_on_client_
    - 20250318_1549_1776b619f139_change_booking_default_status_to_active
    """
    # === From migration 2dadcbaa2fea (merge_first_and_last_name) ===
    op.drop_index('ix_barcode_sequences_category_id', table_name='barcode_sequences')
    op.drop_index('ix_barcode_sequences_created_at', table_name='barcode_sequences')
    op.drop_index('ix_barcode_sequences_deleted_at', table_name='barcode_sequences')
    op.drop_index('ix_barcode_sequences_updated_at', table_name='barcode_sequences')
    op.drop_table('barcode_sequences')
    op.drop_index('ix_bookings_end_date', table_name='bookings')
    op.drop_index('ix_bookings_start_date', table_name='bookings')
    op.drop_column('bookings', 'actual_return_date')
    op.drop_index('ix_categories_deleted_at', table_name='categories')
    op.drop_index('ix_categories_name', table_name='categories')
    op.create_unique_constraint(None, 'categories', ['name'])
    op.drop_constraint('categories_parent_id_fkey', 'categories', type_='foreignkey')
    op.create_foreign_key(
        None, 'categories', 'categories', ['parent_id'], ['id'], ondelete='RESTRICT'
    )

    # Add name column as nullable first
    op.add_column('clients', sa.Column('name', sa.String(length=200), nullable=True))

    # Populate name column with concatenated first_name and last_name
    op.execute("UPDATE clients SET name = first_name || ' ' || last_name")

    # Make name column not nullable after data migration
    op.alter_column('clients', 'name', nullable=False)

    op.alter_column(
        'clients',
        'passport_number',
        existing_type=sa.VARCHAR(length=50),
        type_=sa.String(length=20),
        existing_nullable=False,
    )
    op.drop_index('ix_clients_email', table_name='clients')
    op.create_unique_constraint(None, 'clients', ['passport_number'])
    op.create_unique_constraint(None, 'clients', ['email'])
    op.create_unique_constraint(None, 'clients', ['phone'])

    # Now drop the old columns
    op.drop_column('clients', 'last_name')
    op.drop_column('clients', 'first_name')

    op.add_column(
        'documents', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(
        op.f('ix_documents_booking_id'), 'documents', ['booking_id'], unique=False
    )
    op.create_index(
        op.f('ix_documents_client_id'), 'documents', ['client_id'], unique=False
    )
    op.alter_column(
        'equipment',
        'notes',
        existing_type=sa.VARCHAR(length=1000),
        type_=sa.String(length=5000),
        existing_nullable=True,
    )
    op.drop_index(
        'idx_equipment_barcode_search', table_name='equipment', postgresql_using='gin'
    )
    op.drop_index(
        'idx_equipment_description_search',
        table_name='equipment',
        postgresql_using='gin',
    )
    op.drop_index(
        'idx_equipment_name_search', table_name='equipment', postgresql_using='gin'
    )
    op.drop_index(
        'idx_equipment_serial_number_search',
        table_name='equipment',
        postgresql_using='gin',
    )
    op.drop_index(
        'ix_global_barcode_sequence_created_at', table_name='global_barcode_sequence'
    )
    op.drop_index(
        'ix_global_barcode_sequence_deleted_at', table_name='global_barcode_sequence'
    )
    op.drop_index(
        'ix_global_barcode_sequence_updated_at', table_name='global_barcode_sequence'
    )
    op.drop_index('ix_users_deleted_at', table_name='users')

    # === From migration dc9988c1f5cb (remove_passport_and_address_make_) ===
    op.alter_column(
        'clients', 'email', existing_type=sa.VARCHAR(length=255), nullable=True
    )
    op.alter_column(
        'clients', 'phone', existing_type=sa.VARCHAR(length=20), nullable=True
    )
    op.drop_constraint('clients_passport_number_key', 'clients', type_='unique')
    op.drop_column('clients', 'passport_number')
    op.drop_column('clients', 'address')

    # === From migration 0d544e3b71ec (remove_unique_constraints_on_client_) ===
    op.drop_constraint('clients_email_key', 'clients', type_='unique')
    op.drop_constraint('clients_phone_key', 'clients', type_='unique')

    # === From migration 1776b619f139 (change_booking_default_status_to_active) ===
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN booking_status "
        "SET DEFAULT 'ACTIVE'::bookingstatus"
    )


def downgrade() -> None:
    """Combined downgrade operations for all migrations.

    Note: This operation is complex and may not work perfectly in all cases
    due to data dependencies and constraints.
    """
    # === From migration 1776b619f139 (reverse) ===
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN booking_status "
        "SET DEFAULT 'PENDING'::bookingstatus"
    )

    # === From migration 0d544e3b71ec (reverse) ===
    # Disabling unique constraint creation for rollback as there might be duplicates
    # op.create_unique_constraint('clients_phone_key', 'clients', ['phone'])
    # op.create_unique_constraint('clients_email_key', 'clients', ['email'])

    # === From migration dc9988c1f5cb (reverse) ===
    op.add_column(
        'clients',
        sa.Column(
            'address', sa.VARCHAR(length=500), autoincrement=False, nullable=True
        ),
    )
    op.add_column(
        'clients',
        sa.Column(
            'passport_number',
            sa.VARCHAR(length=20),
            autoincrement=False,
            nullable=True,
        ),
    )
    # op.create_unique_constraint(
    #     'clients_passport_number_key', 'clients', ['passport_number']
    # )
    # op.alter_column(
    #     'clients', 'phone', existing_type=sa.VARCHAR(length=20), nullable=False
    # )
    # op.alter_column(
    #     'clients', 'email', existing_type=sa.VARCHAR(length=255), nullable=False
    # )

    # === From migration 2dadcbaa2fea (reverse) ===
    op.create_index('ix_users_deleted_at', 'users', ['deleted_at'], unique=False)
    op.create_index(
        'ix_global_barcode_sequence_updated_at',
        'global_barcode_sequence',
        ['updated_at'],
        unique=False,
    )
    op.create_index(
        'ix_global_barcode_sequence_deleted_at',
        'global_barcode_sequence',
        ['deleted_at'],
        unique=False,
    )
    op.create_index(
        'ix_global_barcode_sequence_created_at',
        'global_barcode_sequence',
        ['created_at'],
        unique=False,
    )
    op.create_index(
        'idx_equipment_serial_number_search',
        'equipment',
        ['serial_number'],
        unique=False,
        postgresql_using='gin',
    )
    op.create_index(
        'idx_equipment_name_search',
        'equipment',
        ['name'],
        unique=False,
        postgresql_using='gin',
    )
    op.create_index(
        'idx_equipment_description_search',
        'equipment',
        ['description'],
        unique=False,
        postgresql_using='gin',
    )
    op.create_index(
        'idx_equipment_barcode_search',
        'equipment',
        ['barcode'],
        unique=False,
        postgresql_using='gin',
    )
    op.drop_index(op.f('ix_documents_client_id'), table_name='documents')
    op.drop_index(op.f('ix_documents_booking_id'), table_name='documents')
    op.drop_column('documents', 'deleted_at')

    # Add back first_name and last_name columns as nullable first
    op.add_column(
        'clients',
        sa.Column(
            'first_name', sa.VARCHAR(length=100), autoincrement=False, nullable=True
        ),
    )
    op.add_column(
        'clients',
        sa.Column(
            'last_name', sa.VARCHAR(length=100), autoincrement=False, nullable=True
        ),
    )

    # Split name back to first_name and last_name (simplified approach)
    op.execute(
        """
    UPDATE clients
    SET
        first_name = SUBSTRING(name FROM 1 FOR POSITION(' ' IN name) - 1),
        last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    WHERE POSITION(' ' IN name) > 0
    """
    )

    # For names without a space, set the entire name as first_name
    op.execute(
        """
    UPDATE clients
    SET
        first_name = name,
        last_name = ''
    WHERE POSITION(' ' IN name) = 0
    """
    )

    # Commented out because it may cause errors if fields contain NULL
    # op.alter_column('clients', 'first_name', nullable=False)
    # op.alter_column('clients', 'last_name', nullable=False)

    # Now drop name column
    # op.drop_constraint('clients_email_key', 'clients', type_='unique')
    # op.drop_constraint('clients_phone_key', 'clients', type_='unique')
    # op.drop_constraint('clients_passport_number_key', 'clients', type_='unique')
    # op.create_index('ix_clients_email', 'clients', ['email'], unique=True)
    op.drop_column('clients', 'name')
    op.drop_constraint('categories_parent_id_fkey', 'categories', type_='foreignkey')
    op.create_foreign_key(
        'categories_parent_id_fkey',
        'categories',
        'categories',
        ['parent_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.drop_constraint('categories_name_key', 'categories', type_='unique')
    op.create_index('ix_categories_name', 'categories', ['name'], unique=False)
    op.create_index(
        'ix_categories_deleted_at', 'categories', ['deleted_at'], unique=False
    )
    op.add_column(
        'bookings',
        sa.Column(
            'actual_return_date',
            postgresql.TIMESTAMP(timezone=True),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.create_index('ix_bookings_start_date', 'bookings', ['start_date'], unique=False)
    op.create_index('ix_bookings_end_date', 'bookings', ['end_date'], unique=False)
    op.create_table(
        'barcode_sequences',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('category_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column(
            'last_number',
            sa.INTEGER(),
            server_default=sa.text('0'),
            autoincrement=False,
            nullable=False,
            comment='Last used sequence number',
        ),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            autoincrement=False,
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            autoincrement=False,
            nullable=False,
        ),
        sa.Column(
            'deleted_at',
            postgresql.TIMESTAMP(timezone=True),
            autoincrement=False,
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ['category_id'],
            ['categories.id'],
            name='barcode_sequences_category_id_fkey',
        ),
        sa.PrimaryKeyConstraint('id', name='barcode_sequences_pkey'),
    )
    op.create_index(
        'ix_barcode_sequences_updated_at',
        'barcode_sequences',
        ['updated_at'],
        unique=False,
    )
    op.create_index(
        'ix_barcode_sequences_deleted_at',
        'barcode_sequences',
        ['deleted_at'],
        unique=False,
    )
    op.create_index(
        'ix_barcode_sequences_created_at',
        'barcode_sequences',
        ['created_at'],
        unique=False,
    )
    op.create_index(
        'ix_barcode_sequences_category_id',
        'barcode_sequences',
        ['category_id'],
        unique=False,
    )
