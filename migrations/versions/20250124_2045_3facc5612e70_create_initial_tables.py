"""create initial tables

Revision ID: 3facc5612e70
Revises:
Create Date: 2025-01-24 20:45:13.595037+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '3facc5612e70'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, index=True),
        sa.Column('description', sa.String(500)),
        sa.Column(
            'parent_id',
            sa.Integer(),
            sa.ForeignKey('categories.id', ondelete='SET NULL'),
        ),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    op.create_table(
        'equipment',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False, index=True),
        sa.Column('description', sa.String(1000)),
        sa.Column('serial_number', sa.String(100), unique=True, index=True),
        sa.Column('barcode', sa.String(100), unique=True, index=True),
        sa.Column(
            'category_id',
            sa.Integer(),
            sa.ForeignKey('categories.id', ondelete='RESTRICT'),
        ),
        sa.Column(
            'status',
            sa.Enum(
                'available',
                'rented',
                'maintenance',
                'broken',
                'retired',
                name='equipmentstatus',
            ),
            nullable=False,
            default='available',
        ),
        sa.Column('daily_rate', sa.Numeric(10, 2), nullable=False),
        sa.Column('replacement_cost', sa.Numeric(10, 2), nullable=False),
        sa.Column('notes', sa.String(1000)),
        # Временные метки и soft delete
        sa.Column(
            'created_at', sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
    )

    op.create_table(
        'clients',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), unique=True, index=True),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('company', sa.String(200)),
        sa.Column(
            'status',
            sa.Enum('active', 'blocked', 'archived', name='clientstatus'),
            nullable=False,
            default='active',
        ),
        sa.Column('notes', sa.String(1000)),
        sa.Column('passport_number', sa.String(50), nullable=False),
        sa.Column('address', sa.String(500), nullable=False),
        # Временные метки и soft delete
        sa.Column(
            'created_at', sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
    )

    op.create_table(
        'bookings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'client_id', sa.Integer(), sa.ForeignKey('clients.id', ondelete='RESTRICT')
        ),
        sa.Column(
            'equipment_id',
            sa.Integer(),
            sa.ForeignKey('equipment.id', ondelete='RESTRICT'),
        ),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('actual_return_date', sa.DateTime(timezone=True)),
        sa.Column(
            'booking_status',
            sa.Enum(
                'pending',
                'confirmed',
                'active',
                'completed',
                'cancelled',
                'overdue',
                name='bookingstatus',
            ),
            nullable=False,
            default='pending',
        ),
        sa.Column(
            'payment_status',
            sa.Enum(
                'pending',
                'partial',
                'paid',
                'refunded',
                'overdue',
                name='paymentstatus',
            ),
            nullable=False,
            default='pending',
        ),
        sa.Column('total_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('paid_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('deposit_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('notes', sa.String(1000)),
        # Временные метки
        sa.Column(
            'created_at', sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'client_id', sa.Integer(), sa.ForeignKey('clients.id', ondelete='RESTRICT')
        ),
        sa.Column(
            'booking_id',
            sa.Integer(),
            sa.ForeignKey('bookings.id', ondelete='SET NULL'),
        ),
        sa.Column(
            'type',
            sa.Enum(
                'contract',
                'invoice',
                'receipt',
                'passport',
                'damage_report',
                'insurance',
                'other',
                name='documenttype',
            ),
            nullable=False,
        ),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.String(1000)),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('notes', sa.String(1000)),
        # Временные метки
        sa.Column(
            'created_at', sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table('documents')
    op.drop_table('bookings')
    op.drop_table('clients')
    op.drop_table('equipment')
    op.drop_table('categories')

    op.execute('DROP TYPE documenttype')
    op.execute('DROP TYPE paymentstatus')
    op.execute('DROP TYPE bookingstatus')
    op.execute('DROP TYPE clientstatus')
    op.execute('DROP TYPE equipmentstatus')
