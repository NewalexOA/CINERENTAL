"""Business logic service for backup operations."""

import logging
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Callable, List, Optional, Tuple

from .backup_models import BackupInfo, BackupStatus
from .backup_utils import (
    delete_backup_directory,
    ensure_backup_directory_exists,
    find_existing_backups,
    format_duration,
    run_backup_script,
    run_restore_script,
)


class BackupService:
    """Service class for backup operations."""

    def __init__(self, docker_manager: Optional[Any] = None) -> None:
        """Initialize backup service.

        Args:
            docker_manager: Optional DockerManager instance for system checks
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self._docker_manager = docker_manager
        self._backup_cache: Optional[List[BackupInfo]] = None
        self._cache_timestamp: Optional[datetime] = None
        self._cache_lock = threading.Lock()

        # Progress callback for long-running operations
        self._progress_callback: Optional[Callable[[str], None]] = None

    def set_progress_callback(self, callback: Callable[[str], None]) -> None:
        """Set callback for progress updates during operations.

        Args:
            callback: Function to call with progress messages
        """
        self._progress_callback = callback

    def _emit_progress(self, message: str) -> None:
        """Emit progress message if callback is set.

        Args:
            message: Progress message
        """
        if self._progress_callback:
            self._progress_callback(message)
        self.logger.info(message)

    def get_backup_list(self, force_refresh: bool = False) -> List[BackupInfo]:
        """Get list of all available backups.

        Args:
            force_refresh: Force refresh of backup cache

        Returns:
            List of BackupInfo objects
        """
        with self._cache_lock:
            # Check if cache is valid (5 minutes)
            if (
                not force_refresh
                and self._backup_cache is not None
                and self._cache_timestamp is not None
                and datetime.now() - self._cache_timestamp < timedelta(minutes=5)
            ):
                return self._backup_cache.copy()

            self._emit_progress('Сканирование существующих резервных копий...')

            backup_paths = find_existing_backups()
            backups = []

            for i, backup_path in enumerate(backup_paths):
                try:
                    self._emit_progress(
                        f'Анализ резервной копии {i+1}/{len(backup_paths)}...'
                    )
                    backup_info = BackupInfo.from_backup_directory(backup_path)
                    backups.append(backup_info)
                except Exception as e:
                    self.logger.error(f'Error parsing backup {backup_path}: {str(e)}')
                    # Create invalid backup entry
                    invalid_backup = BackupInfo(
                        path=backup_path,
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
                        error_message=f'Parsing error: {str(e)}',
                    )
                    backups.append(invalid_backup)

            # Sort by timestamp (newest first)
            backups.sort(key=lambda b: b.timestamp, reverse=True)

            self._backup_cache = backups
            self._cache_timestamp = datetime.now()

            self._emit_progress(f'Найдено резервных копий: {len(backups)}')

            return backups.copy()

    def create_backup(self) -> Tuple[bool, str]:
        """Create a new backup.

        Returns:
            Tuple of (success, message)
        """
        try:
            self._emit_progress('Проверка готовности системы...')

            # Pre-flight checks using DockerManager if available
            if self._docker_manager:
                if not self._docker_manager.is_docker_running():
                    return False, 'Docker не запущен или недоступен'

                if not self._docker_manager.check_act_rental_running():
                    return (
                        False,
                        'ACT-Rental не запущен. Запустите приложение перед '
                        'созданием резервной копии',
                    )
            else:
                # DockerManager not available
                # This shouldn't happen in normal operation
                self.logger.warning('DockerManager not available for system checks')
                return (
                    False,
                    'Система не готова: отсутствует компонент управления Docker',
                )

            # Ensure backup directory exists
            ensure_backup_directory_exists()

            self._emit_progress('Запуск процесса создания резервной копии...')
            start_time = time.time()

            # Run backup script
            success, stdout, stderr = run_backup_script()

            end_time = time.time()
            duration = int(end_time - start_time)

            if success:
                # Clear cache to force refresh
                with self._cache_lock:
                    self._backup_cache = None
                    self._cache_timestamp = None

                message = (
                    f'Резервная копия успешно создана за {format_duration(duration)}'
                )
                self._emit_progress(message)
                return True, message
            else:
                error_msg = stderr or stdout or 'Неизвестная ошибка'
                message = f'Ошибка создания резервной копии: {error_msg}'
                self._emit_progress(message)
                return False, message

        except Exception as e:
            error_msg = f'Неожиданная ошибка при создании резервной копии: {str(e)}'
            self._emit_progress(error_msg)
            return False, error_msg

    def restore_backup(self, backup_info: BackupInfo) -> Tuple[bool, str]:
        """Restore from backup.

        Args:
            backup_info: Backup to restore from

        Returns:
            Tuple of (success, message)
        """
        try:
            self._emit_progress('Проверка резервной копии...')

            # Validate backup
            if not backup_info.is_valid:
                return False, f'Резервная копия невалидна: {backup_info.error_message}'

            if not os.path.exists(backup_info.path):
                return False, 'Резервная копия не найдена'

            # Check system readiness using DockerManager
            if self._docker_manager:
                if not self._docker_manager.is_docker_running():
                    return False, 'Docker не запущен или недоступен'
            else:
                self.logger.warning('DockerManager not available for restore operation')
                return (
                    False,
                    'Система не готова: отсутствует компонент управления Docker',
                )

            self._emit_progress('Запуск процесса восстановления...')
            start_time = time.time()

            # Run restore script
            success, stdout, stderr = run_restore_script(backup_info.path)

            end_time = time.time()
            duration = int(end_time - start_time)

            if success:
                message = (
                    f'Восстановление успешно завершено за {format_duration(duration)}'
                )
                self._emit_progress(message)
                return True, message
            else:
                error_msg = stderr or stdout or 'Неизвестная ошибка'
                message = f'Ошибка восстановления: {error_msg}'
                self._emit_progress(message)
                return False, message

        except Exception as e:
            error_msg = f'Неожиданная ошибка при восстановлении: {str(e)}'
            self._emit_progress(error_msg)
            return False, error_msg

    def delete_backup(self, backup_info: BackupInfo) -> Tuple[bool, str]:
        """Delete a backup.

        Args:
            backup_info: Backup to delete

        Returns:
            Tuple of (success, message)
        """
        try:
            self._emit_progress(
                f'Удаление резервной копии {backup_info.formatted_timestamp}...'
            )

            success, error_msg = delete_backup_directory(backup_info.path)

            if success:
                # Clear cache to force refresh
                with self._cache_lock:
                    self._backup_cache = None
                    self._cache_timestamp = None

                message = 'Резервная копия успешно удалена'
                self._emit_progress(message)
                return True, message
            else:
                message = f'Ошибка удаления резервной копии: {error_msg}'
                self._emit_progress(message)
                return False, message

        except Exception as e:
            error_msg = f'Неожиданная ошибка при удалении: {str(e)}'
            self._emit_progress(error_msg)
            return False, error_msg

    def cleanup_old_backups(self, keep_days: int = 30) -> Tuple[bool, str, int]:
        """Clean up old backups.

        Args:
            keep_days: Number of days to keep backups

        Returns:
            Tuple of (success, message, deleted_count)
        """
        try:
            self._emit_progress('Поиск устаревших резервных копий...')

            backups = self.get_backup_list(force_refresh=True)
            cutoff_date = datetime.now() - timedelta(days=keep_days)

            old_backups = [b for b in backups if b.timestamp < cutoff_date]

            if not old_backups:
                message = 'Устаревших резервных копий не найдено'
                self._emit_progress(message)
                return True, message, 0

            deleted_count = 0
            failed_count = 0

            for backup in old_backups:
                self._emit_progress(
                    f'Удаление резервной копии от {backup.formatted_timestamp}...'
                )

                success, _ = delete_backup_directory(backup.path)
                if success:
                    deleted_count += 1
                else:
                    failed_count += 1

            # Clear cache
            with self._cache_lock:
                self._backup_cache = None
                self._cache_timestamp = None

            if failed_count == 0:
                message = f'Успешно удалено {deleted_count} устаревших резервных копий'
            else:
                message = (
                    f'Удалено {deleted_count} резервных копий, {failed_count} ошибок'
                )

            self._emit_progress(message)
            return failed_count == 0, message, deleted_count

        except Exception as e:
            error_msg = f'Ошибка очистки старых резервных копий: {str(e)}'
            self._emit_progress(error_msg)
            return False, error_msg, 0

    def get_backup_statistics(self) -> dict:
        """Get backup statistics.

        Returns:
            Dictionary with backup statistics
        """
        try:
            backups = self.get_backup_list()

            if not backups:
                return {
                    'total_backups': 0,
                    'total_size': 0,
                    'total_size_formatted': '0 B',
                    'latest_backup': None,
                    'valid_backups': 0,
                    'invalid_backups': 0,
                    'average_size': 0,
                }

            valid_backups = [b for b in backups if b.is_valid]
            invalid_backups = [b for b in backups if not b.is_valid]

            total_size = sum(b.size for b in backups)
            average_size = total_size // len(backups) if backups else 0

            latest_backup = max(backups, key=lambda b: b.timestamp) if backups else None

            return {
                'total_backups': len(backups),
                'total_size': total_size,
                'total_size_formatted': self._format_size(total_size),
                'latest_backup': latest_backup,
                'valid_backups': len(valid_backups),
                'invalid_backups': len(invalid_backups),
                'average_size': average_size,
                'average_size_formatted': self._format_size(average_size),
            }

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

    def _format_size(self, size_bytes: int) -> str:
        """Format size in bytes to human readable format."""
        size = float(size_bytes)  # Convert to float to avoid type error
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f'{size:.1f} {unit}'
            size /= 1024.0
        return f'{size:.1f} PB'

    def check_system_ready(self) -> Tuple[bool, str]:
        """Check if system is ready for backup operations.

        Returns:
            Tuple of (ready, status_message)
        """
        if self._docker_manager:
            # Use DockerManager for accurate checks
            if not self._docker_manager.is_docker_running():
                return False, 'Docker не запущен'

            if not self._docker_manager.check_act_rental_running():
                return False, 'ACT-Rental не запущен'

            return True, 'Система готова'
        else:
            # DockerManager not available
            self.logger.warning(
                'DockerManager not available for system readiness check'
            )
            return False, 'Система не готова: отсутствует компонент управления Docker'
