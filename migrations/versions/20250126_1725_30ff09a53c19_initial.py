"""initial

Revision ID: 30ff09a53c19
Revises:
Create Date: 2025-01-26 17:25:08.738224+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '30ff09a53c19'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###

    # Create pg_trgm extension for search functionality
    op.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm')

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column(
            'is_active',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('true'),
        ),
        sa.Column(
            'is_superuser',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ),
        sa.Column('full_name', sa.String(length=255), nullable=True),
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
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_created_at'), 'users', ['created_at'], unique=False)
    op.create_index(op.f('ix_users_updated_at'), 'users', ['updated_at'], unique=False)
    op.create_index(op.f('ix_users_deleted_at'), 'users', ['deleted_at'], unique=False)

    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
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
        sa.ForeignKeyConstraint(['parent_id'], ['categories.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_categories_created_at'), 'categories', ['created_at'], unique=False
    )
    op.create_index(
        op.f('ix_categories_deleted_at'), 'categories', ['deleted_at'], unique=False
    )
    op.create_index(op.f('ix_categories_name'), 'categories', ['name'], unique=False)
    op.create_index(
        op.f('ix_categories_updated_at'), 'categories', ['updated_at'], unique=False
    )

    # Create barcode_sequences table
    op.create_table(
        'barcode_sequences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column(
            'last_number',
            sa.Integer(),
            nullable=False,
            server_default=sa.text('0'),
            comment='Last used sequence number',
        ),
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
        sa.Column(
            'deleted_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'category_id',
            name='uq_category',
        ),
    )
    op.create_index(
        op.f('ix_barcode_sequences_created_at'),
        'barcode_sequences',
        ['created_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_barcode_sequences_updated_at'),
        'barcode_sequences',
        ['updated_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_barcode_sequences_deleted_at'),
        'barcode_sequences',
        ['deleted_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_barcode_sequences_category_id'),
        'barcode_sequences',
        ['category_id'],
        unique=False,
    )

    op.create_table(
        'clients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('company', sa.String(length=200), nullable=True),
        sa.Column(
            'status',
            sa.Enum('ACTIVE', 'BLOCKED', 'ARCHIVED', name='clientstatus'),
            nullable=False,
        ),
        sa.Column('notes', sa.String(length=1000), nullable=True),
        sa.Column('passport_number', sa.String(length=50), nullable=False),
        sa.Column('address', sa.String(length=500), nullable=False),
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
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_clients_created_at'), 'clients', ['created_at'], unique=False
    )
    op.create_index(
        op.f('ix_clients_deleted_at'), 'clients', ['deleted_at'], unique=False
    )
    op.create_index(op.f('ix_clients_email'), 'clients', ['email'], unique=True)
    op.create_index(op.f('ix_clients_status'), 'clients', ['status'], unique=False)
    op.create_index(
        op.f('ix_clients_updated_at'), 'clients', ['updated_at'], unique=False
    )
    op.create_table(
        'equipment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('barcode', sa.String(length=100), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column(
            'status',
            sa.Enum(
                'AVAILABLE',
                'RENTED',
                'MAINTENANCE',
                'BROKEN',
                'RETIRED',
                name='equipmentstatus',
            ),
            nullable=False,
        ),
        sa.Column(
            'replacement_cost', sa.Numeric(precision=10, scale=2), nullable=False
        ),
        sa.Column('notes', sa.String(length=1000), nullable=True),
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
        sa.ForeignKeyConstraint(
            ['category_id'], ['categories.id'], ondelete='RESTRICT'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_equipment_barcode'), 'equipment', ['barcode'], unique=True)
    op.create_index(
        op.f('ix_equipment_created_at'), 'equipment', ['created_at'], unique=False
    )
    op.create_index(
        op.f('ix_equipment_deleted_at'), 'equipment', ['deleted_at'], unique=False
    )
    op.create_index(op.f('ix_equipment_name'), 'equipment', ['name'], unique=False)
    op.create_index(
        op.f('ix_equipment_serial_number'), 'equipment', ['serial_number'], unique=True
    )
    op.create_index(op.f('ix_equipment_status'), 'equipment', ['status'], unique=False)
    op.create_index(
        op.f('ix_equipment_updated_at'), 'equipment', ['updated_at'], unique=False
    )
    op.create_table(
        'bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('equipment_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actual_return_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'booking_status',
            sa.Enum(
                'PENDING',
                'CONFIRMED',
                'ACTIVE',
                'COMPLETED',
                'CANCELLED',
                'OVERDUE',
                name='bookingstatus',
            ),
            nullable=False,
        ),
        sa.Column(
            'payment_status',
            sa.Enum(
                'PENDING',
                'PARTIAL',
                'PAID',
                'REFUNDED',
                'OVERDUE',
                name='paymentstatus',
            ),
            nullable=False,
        ),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('paid_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('deposit_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('notes', sa.String(length=1000), nullable=True),
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
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(
            ['equipment_id'], ['equipment.id'], ondelete='RESTRICT'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_bookings_booking_status'), 'bookings', ['booking_status'], unique=False
    )
    op.create_index(
        op.f('ix_bookings_created_at'), 'bookings', ['created_at'], unique=False
    )
    op.create_index(
        op.f('ix_bookings_end_date'), 'bookings', ['end_date'], unique=False
    )
    op.create_index(
        op.f('ix_bookings_payment_status'), 'bookings', ['payment_status'], unique=False
    )
    op.create_index(
        op.f('ix_bookings_start_date'), 'bookings', ['start_date'], unique=False
    )
    op.create_index(
        op.f('ix_bookings_updated_at'), 'bookings', ['updated_at'], unique=False
    )
    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column(
            'type',
            sa.Enum(
                'CONTRACT',
                'INVOICE',
                'RECEIPT',
                'PASSPORT',
                'DAMAGE_REPORT',
                'INSURANCE',
                'OTHER',
                name='documenttype',
            ),
            nullable=False,
        ),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('notes', sa.String(length=1000), nullable=True),
        sa.Column(
            'status',
            sa.Enum(
                'DRAFT',
                'PENDING',
                'UNDER_REVIEW',
                'APPROVED',
                'REJECTED',
                'EXPIRED',
                'CANCELLED',
                name='documentstatus',
            ),
            nullable=False,
        ),
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
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_documents_created_at'), 'documents', ['created_at'], unique=False
    )
    op.create_index(op.f('ix_documents_status'), 'documents', ['status'], unique=False)
    op.create_index(op.f('ix_documents_type'), 'documents', ['type'], unique=False)
    op.create_index(
        op.f('ix_documents_updated_at'), 'documents', ['updated_at'], unique=False
    )

    # Create GIN indices for equipment search fields
    op.execute(
        'CREATE INDEX idx_equipment_name_search '
        'ON equipment USING gin (name gin_trgm_ops)'
    )
    op.execute(
        'CREATE INDEX idx_equipment_barcode_search '
        'ON equipment USING gin (barcode gin_trgm_ops)'
    )
    op.execute(
        'CREATE INDEX idx_equipment_description_search '
        'ON equipment USING gin (description gin_trgm_ops)'
    )
    op.execute(
        'CREATE INDEX idx_equipment_serial_number_search '
        'ON equipment USING gin (serial_number gin_trgm_ops)'
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###

    # Drop search indices
    op.execute('DROP INDEX IF EXISTS idx_equipment_name_search')
    op.execute('DROP INDEX IF EXISTS idx_equipment_barcode_search')
    op.execute('DROP INDEX IF EXISTS idx_equipment_description_search')
    op.execute('DROP INDEX IF EXISTS idx_equipment_serial_number_search')

    op.drop_index(op.f('ix_documents_updated_at'), table_name='documents')
    op.drop_index(op.f('ix_documents_type'), table_name='documents')
    op.drop_index(op.f('ix_documents_status'), table_name='documents')
    op.drop_index(op.f('ix_documents_created_at'), table_name='documents')
    op.drop_table('documents')
    op.drop_index(op.f('ix_bookings_updated_at'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_start_date'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_payment_status'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_end_date'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_created_at'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_booking_status'), table_name='bookings')
    op.drop_table('bookings')
    op.drop_index(op.f('ix_equipment_updated_at'), table_name='equipment')
    op.drop_index(op.f('ix_equipment_status'), table_name='equipment')
    op.drop_index(op.f('ix_equipment_serial_number'), table_name='equipment')
    op.drop_index(op.f('ix_equipment_name'), table_name='equipment')
    op.drop_index(op.f('ix_equipment_deleted_at'), table_name='equipment')
    op.drop_index(op.f('ix_equipment_created_at'), table_name='equipment')
    op.drop_index(op.f('ix_equipment_barcode'), table_name='equipment')
    op.drop_table('equipment')
    op.drop_index(op.f('ix_clients_updated_at'), table_name='clients')
    op.drop_index(op.f('ix_clients_status'), table_name='clients')
    op.drop_index(op.f('ix_clients_email'), table_name='clients')
    op.drop_index(op.f('ix_clients_deleted_at'), table_name='clients')
    op.drop_index(op.f('ix_clients_created_at'), table_name='clients')
    op.drop_table('clients')
    op.drop_index(op.f('ix_categories_updated_at'), table_name='categories')
    op.drop_index(op.f('ix_categories_deleted_at'), table_name='categories')
    op.drop_index(op.f('ix_categories_name'), table_name='categories')
    op.drop_index(op.f('ix_categories_created_at'), table_name='categories')
    op.drop_table('categories')
    op.drop_index(
        op.f('ix_barcode_sequences_category_id'), table_name='barcode_sequences'
    )
    op.drop_index(
        op.f('ix_barcode_sequences_updated_at'), table_name='barcode_sequences'
    )
    op.drop_index(
        op.f('ix_barcode_sequences_deleted_at'), table_name='barcode_sequences'
    )
    op.drop_index(
        op.f('ix_barcode_sequences_created_at'), table_name='barcode_sequences'
    )
    op.drop_table('barcode_sequences')
    op.drop_index(op.f('ix_users_deleted_at'), table_name='users')
    op.drop_index(op.f('ix_users_updated_at'), table_name='users')
    op.drop_index(op.f('ix_users_created_at'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    # ### end Alembic commands ###
