"""Script to extract extended data from database to JSON format."""

import argparse
import json
import os
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List

from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.core.config import settings
from backend.core.logging import configure_logging
from backend.models.booking import Booking
from backend.models.category import Category
from backend.models.client import Client
from backend.models.equipment import Equipment
from backend.models.project import Project


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder for datetime objects."""

    def default(self, obj: Any) -> Any:
        """Convert datetime and Decimal objects to serializable format."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def extract_categories(session: Session) -> List[Dict[str, Any]]:
    """Extract all categories from database.

    Args:
        session: Database session

    Returns:
        List of category dictionaries
    """
    categories = session.query(Category).all()

    result = []
    for category in categories:
        result.append(
            {
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'parent_id': category.parent_id,
                'show_in_print_overview': category.show_in_print_overview,
                'created_at': category.created_at,
                'updated_at': category.updated_at,
            }
        )

    logger.info('Extracted {} categories', len(result))
    return result


def extract_equipment(session: Session) -> List[Dict[str, Any]]:
    """Extract all equipment from database.

    Args:
        session: Database session

    Returns:
        List of equipment dictionaries
    """
    equipment_list = session.query(Equipment).all()

    result = []
    for equipment in equipment_list:
        result.append(
            {
                'id': equipment.id,
                'name': equipment.name,
                'description': equipment.description,
                'serial_number': equipment.serial_number,
                'barcode': equipment.barcode,
                'category_id': equipment.category_id,
                'status': equipment.status.value,  # Convert enum to string
                'replacement_cost': equipment.replacement_cost,
                'notes': equipment.notes,
                'created_at': equipment.created_at,
                'updated_at': equipment.updated_at,
            }
        )

    logger.info('Extracted {} equipment items', len(result))
    return result


def extract_clients(session: Session) -> List[Dict[str, Any]]:
    """Extract all clients from database.

    Args:
        session: Database session

    Returns:
        List of client dictionaries
    """
    clients = session.query(Client).all()

    result = []
    for client in clients:
        result.append(
            {
                'id': client.id,
                'name': client.name,
                'email': client.email,
                'phone': client.phone,
                'company': client.company,
                'status': client.status.value,  # Convert enum to string
                'notes': client.notes,
                'created_at': client.created_at,
                'updated_at': client.updated_at,
            }
        )

    logger.info('Extracted {} clients', len(result))
    return result


def extract_projects(session: Session) -> List[Dict[str, Any]]:
    """Extract all projects from database.

    Args:
        session: Database session

    Returns:
        List of project dictionaries
    """
    projects = session.query(Project).all()

    result = []
    for project in projects:
        result.append(
            {
                'id': project.id,
                'name': project.name,
                'client_id': project.client_id,
                'start_date': project.start_date,
                'end_date': project.end_date,
                'status': project.status.value,
                'description': project.description,
                'notes': project.notes,
                'created_at': project.created_at,
                'updated_at': project.updated_at,
            }
        )

    logger.info('Extracted {} projects', len(result))
    return result


def extract_bookings(session: Session) -> List[Dict[str, Any]]:
    """Extract all bookings from database.

    Args:
        session: Database session

    Returns:
        List of booking dictionaries
    """
    bookings = session.query(Booking).all()

    result = []
    for booking in bookings:
        result.append(
            {
                'id': booking.id,
                'client_id': booking.client_id,
                'equipment_id': booking.equipment_id,
                'project_id': booking.project_id,
                'booking_status': booking.booking_status.value,
                'payment_status': booking.payment_status.value,
                'start_date': booking.start_date,
                'end_date': booking.end_date,
                'total_amount': booking.total_amount,
                'deposit_amount': booking.deposit_amount,
                'notes': booking.notes,
                'created_at': booking.created_at,
                'updated_at': booking.updated_at,
            }
        )

    logger.info('Extracted {} bookings', len(result))
    return result


def extract_extended_data(custom_database_url: str | None = None) -> None:
    """Extract all extended data and save to JSON file.

    Args:
        custom_database_url: Optional custom database URL to use instead of settings
    """
    # Configure logging
    configure_logging()

    # Use custom database URL if provided, otherwise use settings
    database_url = custom_database_url or settings.DATABASE_URL
    # Convert asyncpg URL to psycopg2 URL if needed
    if 'postgresql+asyncpg://' in database_url:
        database_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')
    masked_url = (
        database_url.replace('postgres://', 'postgresql://').split('@')[0] + '@...'
    )
    logger.info('Using database URL: {}', masked_url)

    # Create database engine and session
    engine = create_engine(
        database_url,
        echo=False,
    )
    SessionLocal = sessionmaker(
        bind=engine,
        expire_on_commit=False,
    )

    try:
        with SessionLocal() as session:
            logger.info('Starting extended data extraction...')

            # Extract all data
            categories = extract_categories(session)
            equipment = extract_equipment(session)
            clients = extract_clients(session)
            projects = extract_projects(session)
            bookings = extract_bookings(session)

            # Combine all data
            extended_data = {
                'categories': categories,
                'equipment': equipment,
                'clients': clients,
                'projects': projects,
                'bookings': bookings,
                'extracted_at': datetime.now().isoformat(),
                'summary': {
                    'categories_count': len(categories),
                    'equipment_count': len(equipment),
                    'clients_count': len(clients),
                    'projects_count': len(projects),
                    'bookings_count': len(bookings),
                },
            }

            # Save to JSON file
            output_file = Path(__file__).parent / 'extended_data.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(
                    extended_data,
                    f,
                    cls=DateTimeEncoder,
                    ensure_ascii=False,
                    indent=2,
                )

            logger.info('Extended data extracted successfully to {}', output_file)
            logger.info(
                'Summary: {} categories, {} equipment, {} clients, {} projects, {} bookings',  # noqa: E501
                len(categories),
                len(equipment),
                len(clients),
                len(projects),
                len(bookings),
            )

    except Exception as e:
        logger.error('Error extracting extended data: {}', str(e))
        raise
    finally:
        engine.dispose()


def main() -> None:
    """Main function with CLI argument parsing."""
    parser = argparse.ArgumentParser(
        description='Extract extended data from database to JSON'
    )
    parser.add_argument(
        '--database-url',
        help='Custom database URL (can also use TEMP_DATABASE_URL env var)',
    )

    args = parser.parse_args()

    # Check for custom database URL from args or environment
    custom_url = args.database_url or os.getenv('TEMP_DATABASE_URL')

    extract_extended_data(custom_database_url=custom_url)


if __name__ == '__main__':
    main()
