"""Main coordinator class for backup functionality."""

import logging
from pathlib import Path
from typing import Any, Callable, List, Optional, Tuple

from .backup_models import BackupInfo, BackupStatus
from .backup_service import BackupService
from .backup_utils import find_existing_backups


class BackupManager:
    """Main coordinator for backup operations.

    This class provides a high-level interface for backup functionality
    and integrates with the existing DockerManager architecture.
    """

    def __init__(self, docker_manager: Optional[Any] = None) -> None:
        """Initialize backup manager.

        Args:
            docker_manager: Reference to DockerManager instance (optional)
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self._docker_manager = docker_manager
        self._service = BackupService()

        # Progress callback for UI updates
        self._progress_callback: Optional[Callable[[str], None]] = None

        self.logger.info('BackupManager initialized')

    def set_progress_callback(self, callback: Callable[[str], None]) -> None:
        """Set callback for progress updates.

        Args:
            callback: Function to call with progress messages
        """
        self._progress_callback = callback
        self._service.set_progress_callback(callback)

    def get_backups(self, force_refresh: bool = False) -> List[BackupInfo]:
        """Get list of all available backups.

        Args:
            force_refresh: Force refresh of backup cache

        Returns:
            List of BackupInfo objects sorted by timestamp (newest first)
        """
        try:
            return self._service.get_backup_list(force_refresh=force_refresh)
        except Exception as e:
            self.logger.error(f'Error getting backup list: {str(e)}')
            return []

    def create_backup(self) -> Tuple[bool, str]:
        """Create a new backup.

        Returns:
            Tuple of (success, message)
        """
        self.logger.info('Starting backup creation')

        try:
            success, message = self._service.create_backup()

            if success:
                self.logger.info(f'Backup created successfully: {message}')
            else:
                self.logger.error(f'Backup creation failed: {message}')

            return success, message

        except Exception as e:
            error_msg = f'Unexpected error during backup creation: {str(e)}'
            self.logger.error(error_msg)
            return False, error_msg

    def restore_backup(self, backup_info: BackupInfo) -> Tuple[bool, str]:
        """Restore from a backup.

        Args:
            backup_info: Backup to restore from

        Returns:
            Tuple of (success, message)
        """
        self.logger.info(
            f'Starting backup restore from {backup_info.formatted_timestamp}'
        )

        try:
            success, message = self._service.restore_backup(backup_info)

            if success:
                self.logger.info(f'Backup restored successfully: {message}')
            else:
                self.logger.error(f'Backup restore failed: {message}')

            return success, message

        except Exception as e:
            error_msg = f'Unexpected error during backup restore: {str(e)}'
            self.logger.error(error_msg)
            return False, error_msg

    def delete_backup(self, backup_info: BackupInfo) -> Tuple[bool, str]:
        """Delete a backup.

        Args:
            backup_info: Backup to delete

        Returns:
            Tuple of (success, message)
        """
        self.logger.info(f'Deleting backup from {backup_info.formatted_timestamp}')

        try:
            success, message = self._service.delete_backup(backup_info)

            if success:
                self.logger.info(f'Backup deleted successfully: {message}')
            else:
                self.logger.error(f'Backup deletion failed: {message}')

            return success, message

        except Exception as e:
            error_msg = f'Unexpected error during backup deletion: {str(e)}'
            self.logger.error(error_msg)
            return False, error_msg

    def cleanup_old_backups(self, keep_days: int = 30) -> Tuple[bool, str, int]:
        """Clean up old backups.

        Args:
            keep_days: Number of days to keep backups (default: 30)

        Returns:
            Tuple of (success, message, deleted_count)
        """
        self.logger.info(f'Starting cleanup of backups older than {keep_days} days')

        try:
            success, message, deleted_count = self._service.cleanup_old_backups(
                keep_days
            )

            if success:
                self.logger.info(f'Cleanup completed: {deleted_count} backups deleted')
            else:
                self.logger.error(f'Cleanup failed: {message}')

            return success, message, deleted_count

        except Exception as e:
            error_msg = f'Unexpected error during cleanup: {str(e)}'
            self.logger.error(error_msg)
            return False, error_msg, 0

    def get_latest_backup(self) -> Optional[BackupInfo]:
        """Get the most recent backup.

        Returns:
            Latest BackupInfo or None if no backups exist
        """
        try:
            backups = self.get_backups()
            return backups[0] if backups else None
        except Exception as e:
            self.logger.error(f'Error getting latest backup: {str(e)}')
            return None

    def get_latest_backup_fast(self) -> Optional[BackupInfo]:
        """Get the most recent backup with minimal validation (fast).

        This method only checks if backup directory exists and has basic structure.
        Use for quick operations where full validation is not needed.

        Returns:
            Latest BackupInfo or None if no backups exist
        """
        try:
            # Get backup directories (sorted by modification time)
            backup_paths = find_existing_backups()
            if not backup_paths:
                return None

            latest_path = backup_paths[0]  # Already sorted newest first

            # Quick validation - just check if it looks like a valid backup
            backup_dir = Path(latest_path)
            info_file = backup_dir / 'backup_info.txt'

            if not info_file.exists():
                self.logger.warning(f'Latest backup missing info file: {latest_path}')
                return None

            # Create minimal BackupInfo for quick restore
            # We'll read just the essential info quickly
            timestamp = BackupInfo._parse_timestamp_from_path(latest_path)

            # Quick info read (just timestamp and validity check)
            return BackupInfo(
                path=latest_path,
                timestamp=timestamp,
                size=0,  # Will be calculated later if needed
                pg_version='unknown',
                redis_version='unknown',
                app_version='unknown',
                docker_version='unknown',
                equipment_count=0,
                bookings_count=0,
                clients_count=0,
                projects_count=0,
                alembic_version='unknown',
                is_valid=True,  # Assume valid for quick restore
                status=BackupStatus.VALID,
                error_message=None,
            )

        except Exception as e:
            self.logger.error(f'Error getting latest backup (fast): {str(e)}')
            return None

    def get_backup_statistics(self) -> dict:
        """Get comprehensive backup statistics.

        Returns:
            Dictionary with backup statistics
        """
        try:
            return self._service.get_backup_statistics()
        except Exception as e:
            self.logger.error(f'Error getting backup statistics: {str(e)}')
            return {
                'total_backups': 0,
                'total_size': 0,
                'total_size_formatted': '0 B',
                'latest_backup': None,
                'valid_backups': 0,
                'invalid_backups': 0,
                'average_size': 0,
            }

    def check_system_ready(self) -> Tuple[bool, str]:
        """Check if system is ready for backup operations.

        Returns:
            Tuple of (ready, status_message)
        """
        try:
            # If we have docker_manager, use it for more accurate checks
            if self._docker_manager:
                # Use DockerManager's methods for checking
                if not self._docker_manager.is_docker_running():
                    return False, 'Docker не запущен'

                if not self._docker_manager.check_act_rental_running():
                    return False, 'ACT-Rental не запущен'

                return True, 'Система готова'
            else:
                # Fallback to service's check
                return self._service.check_system_ready()

        except Exception as e:
            self.logger.error(f'Error checking system readiness: {str(e)}')
            return False, f'System check error: {str(e)}'

    def get_backup_status_summary(self) -> dict:
        """Get a summary of backup status for UI display.

        Returns:
            Dictionary with status summary
        """
        try:
            stats = self.get_backup_statistics()
            latest = self.get_latest_backup()
            system_ready, system_status = self.check_system_ready()

            # Determine overall status
            if not system_ready:
                overall_status = 'system_not_ready'
                status_message = system_status
            elif stats['total_backups'] == 0:
                overall_status = 'no_backups'
                status_message = 'Резервные копии не найдены'
            elif latest and latest.age_days > 7:
                overall_status = 'outdated'
                status_message = f'Последняя копия: {latest.age_days} дней назад'
            elif latest:
                overall_status = 'up_to_date'
                status_message = f'Последняя копия: {latest.formatted_timestamp}'
            else:
                overall_status = 'unknown'
                status_message = 'Статус неизвестен'

            return {
                'overall_status': overall_status,
                'status_message': status_message,
                'system_ready': system_ready,
                'total_backups': stats['total_backups'],
                'valid_backups': stats['valid_backups'],
                'invalid_backups': stats['invalid_backups'],
                'latest_backup': latest,
            }

        except Exception as e:
            self.logger.error(f'Error getting backup status summary: {str(e)}')
            return {
                'overall_status': 'error',
                'status_message': f'Ошибка получения статуса: {str(e)}',
                'system_ready': False,
                'total_backups': 0,
                'valid_backups': 0,
                'invalid_backups': 0,
                'latest_backup': None,
            }

    def get_quick_status_summary(self) -> dict:
        """Get a quick summary of backup status without heavy operations.

        This method provides minimal status information for initialization
        without triggering expensive backup scanning operations.

        Returns:
            Dictionary with basic status summary
        """
        try:
            # Check system readiness (this is fast)
            system_ready, system_status = self.check_system_ready()

            if not system_ready:
                return {
                    'overall_status': 'system_not_ready',
                    'status_message': system_status,
                    'system_ready': False,
                    'total_backups': 0,
                    'valid_backups': 0,
                    'invalid_backups': 0,
                    'latest_backup': None,
                }

            # Try to get quick count of backup directories (fast)
            from .backup_utils import find_existing_backups

            backup_paths = find_existing_backups()
            backup_count = len(backup_paths)

            if backup_count == 0:
                status_message = 'Резервные копии не найдены'
                overall_status = 'no_backups'
            else:
                status_message = (
                    f'Найдено резервных копий: {backup_count} (загружается...)'
                )
                overall_status = 'loading'

            return {
                'overall_status': overall_status,
                'status_message': status_message,
                'system_ready': system_ready,
                'total_backups': backup_count,
                'valid_backups': backup_count,  # Assume valid for quick status
                'invalid_backups': 0,
                'latest_backup': None,
            }

        except Exception as e:
            self.logger.error(f'Error getting quick status summary: {str(e)}')
            return {
                'overall_status': 'error',
                'status_message': 'Инициализация backup системы...',
                'system_ready': False,
                'total_backups': 0,
                'valid_backups': 0,
                'invalid_backups': 0,
                'latest_backup': None,
            }
