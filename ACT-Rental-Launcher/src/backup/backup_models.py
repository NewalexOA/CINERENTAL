"""Data models for backup system."""

import os
import re
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional


class BackupStatus(Enum):
    """Backup status enumeration."""

    VALID = 'valid'
    INVALID = 'invalid'
    CORRUPTED = 'corrupted'
    INCOMPLETE = 'incomplete'
    UNKNOWN = 'unknown'


@dataclass
class BackupInfo:
    """Comprehensive backup information model."""

    # Basic information
    path: str  # Путь к папке бэкапа
    timestamp: datetime  # Время создания
    size: int  # Размер в байтах

    # Software versions
    pg_version: str  # Версия PostgreSQL
    redis_version: str  # Версия Redis
    app_version: str  # Версия приложения
    docker_version: str  # Версия Docker

    # Database statistics
    equipment_count: int  # Количество оборудования
    bookings_count: int  # Количество бронирований
    clients_count: int  # Количество клиентов
    projects_count: int  # Количество проектов
    alembic_version: str  # Версия схемы БД

    # Status and validation
    is_valid: bool  # Валидность бэкапа
    status: BackupStatus  # Статус бэкапа
    error_message: Optional[str] = None  # Сообщение об ошибке

    # File information
    database_file: Optional[str] = None  # SQL дамп файл
    postgres_volume_file: Optional[str] = None  # PostgreSQL volume архив
    redis_volume_file: Optional[str] = None  # Redis volume архив
    media_volume_file: Optional[str] = None  # Media volume архив
    restore_script: Optional[str] = None  # Скрипт восстановления

    @classmethod
    def from_backup_directory(cls, backup_path: str) -> 'BackupInfo':
        """Create BackupInfo from backup directory analysis.

        Args:
            backup_path: Path to backup directory

        Returns:
            BackupInfo instance with parsed data
        """
        try:
            backup_dir = Path(backup_path)

            if not backup_dir.exists() or not backup_dir.is_dir():
                return cls._create_invalid_backup(
                    backup_path, 'Directory does not exist'
                )

            # Parse timestamp from directory name
            timestamp = cls._parse_timestamp_from_path(backup_path)

            # Read backup_info.txt file
            info_file = backup_dir / 'backup_info.txt'
            info_data = (
                cls._parse_backup_info_file(info_file) if info_file.exists() else {}
            )

            # Calculate total size
            total_size = cls._calculate_directory_size(backup_dir)

            # Find backup files
            files = cls._find_backup_files(backup_dir)

            # Validate backup integrity
            is_valid, status, error_msg = cls._validate_backup(backup_dir, files)

            return cls(
                path=backup_path,
                timestamp=timestamp,
                size=total_size,
                pg_version=info_data.get('pg_version', 'unknown'),
                redis_version=info_data.get('redis_version', 'unknown'),
                app_version=info_data.get('app_version', 'unknown'),
                docker_version=info_data.get('docker_version', 'unknown'),
                equipment_count=info_data.get('equipment_count', 0),
                bookings_count=info_data.get('bookings_count', 0),
                clients_count=info_data.get('clients_count', 0),
                projects_count=info_data.get('projects_count', 0),
                alembic_version=info_data.get('alembic_version', 'unknown'),
                is_valid=is_valid,
                status=status,
                error_message=error_msg,
                database_file=files.get('database'),
                postgres_volume_file=files.get('postgres_volume'),
                redis_volume_file=files.get('redis_volume'),
                media_volume_file=files.get('media_volume'),
                restore_script=files.get('restore_script'),
            )

        except Exception as e:
            return cls._create_invalid_backup(
                backup_path, f'Error parsing backup: {str(e)}'
            )

    @classmethod
    def _create_invalid_backup(cls, path: str, error: str) -> 'BackupInfo':
        """Create invalid backup info instance."""
        return cls(
            path=path,
            timestamp=datetime.now(),
            size=0,
            pg_version='unknown',
            redis_version='unknown',
            app_version='unknown',
            docker_version='unknown',
            equipment_count=0,
            bookings_count=0,
            clients_count=0,
            projects_count=0,
            alembic_version='unknown',
            is_valid=False,
            status=BackupStatus.INVALID,
            error_message=error,
        )

    @classmethod
    def _parse_timestamp_from_path(cls, path: str) -> datetime:
        """Parse timestamp from backup directory name."""
        try:
            # Extract timestamp from path like ".../20240726_182700"
            dir_name = os.path.basename(path)
            timestamp_match = re.search(r'(\d{8}_\d{6})', dir_name)

            if timestamp_match:
                timestamp_str = timestamp_match.group(1)
                return datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S')
            else:
                # Fallback to directory modification time
                return datetime.fromtimestamp(os.path.getmtime(path))

        except Exception:
            return datetime.now()

    @classmethod
    def _parse_backup_info_file(cls, info_file: Path) -> Dict[str, Any]:
        """Parse backup_info.txt file for metadata."""
        info_data = {}

        try:
            with open(info_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Parse versions section
            pg_match = re.search(r'PostgreSQL:\s*([0-9.]+)', content)
            if pg_match:
                info_data['pg_version'] = pg_match.group(1)

            redis_match = re.search(r'Redis:\s*([0-9.]+)', content)
            if redis_match:
                info_data['redis_version'] = redis_match.group(1)

            app_match = re.search(r'App:\s*([^\n]+)', content)
            if app_match:
                info_data['app_version'] = app_match.group(1).strip()

            docker_match = re.search(r'Docker:\s*([^\n]+)', content)
            if docker_match:
                info_data['docker_version'] = docker_match.group(1).strip()

            # Parse statistics
            equipment_match = re.search(r'Оборудование:\s*(\d+)', content)
            if equipment_match:
                info_data['equipment_count'] = int(equipment_match.group(1))

            bookings_match = re.search(r'Бронирования:\s*(\d+)', content)
            if bookings_match:
                info_data['bookings_count'] = int(bookings_match.group(1))

            clients_match = re.search(r'Клиенты:\s*(\d+)', content)
            if clients_match:
                info_data['clients_count'] = int(clients_match.group(1))

            projects_match = re.search(r'Проекты:\s*(\d+)', content)
            if projects_match:
                info_data['projects_count'] = int(projects_match.group(1))

            alembic_match = re.search(r'Alembic версия:\s*([^\n]+)', content)
            if alembic_match:
                info_data['alembic_version'] = alembic_match.group(1).strip()

        except Exception:
            pass  # Return empty dict on any parsing error

        return info_data

    @classmethod
    def _calculate_directory_size(cls, directory: Path) -> int:
        """Calculate total size of backup directory."""
        try:
            total_size = 0
            for file_path in directory.rglob('*'):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
            return total_size
        except Exception:
            return 0

    @classmethod
    def _find_backup_files(cls, backup_dir: Path) -> Dict[str, str]:
        """Find and categorize backup files."""
        files = {}

        for file_path in backup_dir.iterdir():
            if not file_path.is_file():
                continue

            filename = file_path.name

            # SQL dump file
            if filename.endswith('.sql') and 'full_backup' in filename:
                files['database'] = str(file_path)

            # Volume backup files
            elif 'postgres_volume' in filename and filename.endswith('.tar.gz'):
                files['postgres_volume'] = str(file_path)

            elif 'redis_volume' in filename and filename.endswith('.tar.gz'):
                files['redis_volume'] = str(file_path)

            elif 'media_volume' in filename and filename.endswith('.tar.gz'):
                files['media_volume'] = str(file_path)

            # Restore script
            elif filename == 'restore_backup.sh':
                files['restore_script'] = str(file_path)

        return files

    @classmethod
    def _validate_backup(
        cls, backup_dir: Path, files: Dict[str, str]
    ) -> tuple[bool, BackupStatus, Optional[str]]:
        """Validate backup integrity."""
        # Check for required files
        required_files = ['database', 'postgres_volume', 'restore_script']
        missing_files = [f for f in required_files if f not in files]

        if missing_files:
            return (
                False,
                BackupStatus.INCOMPLETE,
                f'Missing files: {", ".join(missing_files)}',
            )

        # Check if backup_info.txt exists
        info_file = backup_dir / 'backup_info.txt'
        if not info_file.exists():
            return False, BackupStatus.INCOMPLETE, 'Missing backup_info.txt'

        # Check file sizes (basic corruption check)
        try:
            for file_type, file_path in files.items():
                if file_path and os.path.exists(file_path):
                    size = os.path.getsize(file_path)
                    if size == 0:
                        return False, BackupStatus.CORRUPTED, f'Empty file: {file_type}'
        except Exception as e:
            return False, BackupStatus.CORRUPTED, f'File check error: {str(e)}'

        return True, BackupStatus.VALID, None

    @property
    def formatted_size(self) -> str:
        """Human-readable size format."""
        size_bytes = float(self.size)  # Convert to float to avoid type error
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f'{size_bytes:.1f} {unit}'
            size_bytes /= 1024.0
        return f'{size_bytes:.1f} PB'

    @property
    def formatted_timestamp(self) -> str:
        """Human-readable timestamp format."""
        return self.timestamp.strftime('%d.%m.%Y %H:%M:%S')

    @property
    def age_days(self) -> int:
        """Age of backup in days."""
        return (datetime.now() - self.timestamp).days

    @property
    def is_recent(self) -> bool:
        """Check if backup is recent (less than 7 days old)."""
        return self.age_days < 7

    @property
    def status_display(self) -> str:
        """Display-friendly status text."""
        status_map = {
            BackupStatus.VALID: 'Валидный',
            BackupStatus.INVALID: 'Невалидный',
            BackupStatus.CORRUPTED: 'Поврежден',
            BackupStatus.INCOMPLETE: 'Неполный',
            BackupStatus.UNKNOWN: 'Неизвестно',
        }
        return status_map.get(self.status, 'Неизвестно')
