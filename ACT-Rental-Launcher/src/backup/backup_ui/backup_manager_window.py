"""Backup manager window with full backup management functionality."""

import os
from typing import List, Optional

from PyQt5.QtCore import Qt, QThread, QTimer, pyqtSignal
from PyQt5.QtGui import QFont, QIcon
from PyQt5.QtWidgets import (
    QAbstractItemView,
    QDialog,
    QDialogButtonBox,
    QFrame,
    QGroupBox,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QMainWindow,
    QMessageBox,
    QProgressDialog,
    QPushButton,
    QSizePolicy,
    QSpacerItem,
    QSplitter,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from ..backup_models import BackupInfo, BackupStatus


class WorkerThread(QThread):
    """Worker thread for backup operations."""

    update_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(bool, str)

    def __init__(self, operation, *args, **kwargs):
        """Initialize worker thread.

        Args:
            operation: Function to execute
            *args: Positional arguments for operation
            **kwargs: Keyword arguments for operation
        """
        super().__init__()
        self.operation = operation
        self.args = args
        self.kwargs = kwargs

    def run(self):
        """Execute operation in separate thread."""
        try:
            result = self.operation(*self.args, **self.kwargs)
            if isinstance(result, tuple) and len(result) >= 2:
                success, message = result[0], result[1]
                self.finished_signal.emit(success, message)
            else:
                self.finished_signal.emit(True, 'Операция выполнена успешно')
        except Exception as e:
            self.finished_signal.emit(False, f'Ошибка: {str(e)}')


class BackupDetailsDialog(QDialog):
    """Dialog for displaying detailed backup information."""

    def __init__(self, backup_info: BackupInfo, parent=None):
        """Initialize backup details dialog.

        Args:
            backup_info: Backup information to display
            parent: Parent widget
        """
        super().__init__(parent)
        self.backup_info = backup_info
        self.init_ui()

    def init_ui(self):
        """Initialize user interface."""
        self.setWindowTitle(
            f'Детали резервной копии - {self.backup_info.formatted_timestamp}'
        )
        self.setMinimumSize(600, 500)

        layout = QVBoxLayout()
        self.setLayout(layout)

        # Create details text
        details_text = QTextEdit()
        details_text.setReadOnly(True)
        details_text.setPlainText(self._format_backup_details())
        layout.addWidget(details_text)

        # Buttons
        button_box = QDialogButtonBox(QDialogButtonBox.Close)
        button_box.rejected.connect(self.close)
        layout.addWidget(button_box)

    def _format_backup_details(self) -> str:
        """Format backup details for display."""
        backup = self.backup_info

        details = f"""ДЕТАЛЬНАЯ ИНФОРМАЦИЯ О РЕЗЕРВНОЙ КОПИИ

ОСНОВНАЯ ИНФОРМАЦИЯ:
Путь: {backup.path}
Дата создания: {backup.formatted_timestamp}
Размер: {backup.formatted_size}
Возраст: {backup.age_days} дней
Статус: {backup.status_display}

ВЕРСИИ ПРОГРАММНОГО ОБЕСПЕЧЕНИЯ:
PostgreSQL: {backup.pg_version}
Redis: {backup.redis_version}
Приложение: {backup.app_version}
Docker: {backup.docker_version}

СТАТИСТИКА БАЗЫ ДАННЫХ:
Оборудование: {backup.equipment_count} единиц
Бронирования: {backup.bookings_count} записей
Клиенты: {backup.clients_count} записей
Проекты: {backup.projects_count} записей
Версия схемы БД: {backup.alembic_version}

ФАЙЛЫ В РЕЗЕРВНОЙ КОПИИ:
"""

        if backup.database_file:
            details += f"SQL дамп: {os.path.basename(backup.database_file)}\n"

        if backup.postgres_volume_file:
            details += (
                f"PostgreSQL volume: {os.path.basename(backup.postgres_volume_file)}\n"
            )

        if backup.redis_volume_file:
            details += f"Redis volume: {os.path.basename(backup.redis_volume_file)}\n"

        if backup.media_volume_file:
            details += f"Media volume: {os.path.basename(backup.media_volume_file)}\n"

        if backup.restore_script:
            details += (
                f"Скрипт восстановления: {os.path.basename(backup.restore_script)}\n"
            )

        if backup.error_message:
            details += f"\nОШИБКИ:\n{backup.error_message}"

        return details


class BackupManagerWindow(QMainWindow):
    """Main backup management window."""

    def __init__(self, backup_manager, parent=None):
        """Initialize backup manager window.

        Args:
            backup_manager: BackupManager instance
            parent: Parent widget
        """
        super().__init__(parent)
        self.backup_manager = backup_manager

        # Set up progress callback
        self.backup_manager.set_progress_callback(self._on_progress_update)

        # UI state
        self.selected_backup: Optional[BackupInfo] = None
        self.backups: List[BackupInfo] = []

        # Refresh timer
        self.refresh_timer = QTimer()
        self.refresh_timer.timeout.connect(self.refresh_backups)

        self.init_ui()
        self.refresh_backups()

        # Timer will be started in showEvent() when window is actually shown

    def init_ui(self):
        """Initialize user interface."""
        self.setWindowTitle('Управление резервными копиями ACT-Rental')
        self.setMinimumSize(1000, 700)

        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # Main layout
        main_layout = QVBoxLayout()
        central_widget.setLayout(main_layout)

        # Create splitter for layout
        splitter = QSplitter(Qt.Vertical)
        main_layout.addWidget(splitter)

        # Top section: Controls and statistics
        top_widget = self._create_top_section()
        splitter.addWidget(top_widget)

        # Bottom section: Backup table
        bottom_widget = self._create_bottom_section()
        splitter.addWidget(bottom_widget)

        # Set splitter proportions
        splitter.setStretchFactor(0, 0)  # Top section fixed
        splitter.setStretchFactor(1, 1)  # Bottom section expandable

    def _create_top_section(self) -> QWidget:
        """Create top section with controls and statistics."""
        widget = QWidget()
        layout = QHBoxLayout()
        widget.setLayout(layout)

        # Statistics group
        stats_group = QGroupBox('Статистика')
        stats_layout = QVBoxLayout()
        stats_group.setLayout(stats_layout)

        self.stats_label = QLabel('Загрузка статистики...')
        stats_layout.addWidget(self.stats_label)

        # Controls group
        controls_group = QGroupBox('Управление')
        controls_layout = QVBoxLayout()
        controls_group.setLayout(controls_layout)

        # Button layouts
        main_buttons_layout = QHBoxLayout()

        self.create_backup_button = QPushButton('Создать резервную копию')
        self.create_backup_button.clicked.connect(self.create_backup)
        main_buttons_layout.addWidget(self.create_backup_button)

        self.refresh_button = QPushButton('Обновить список')
        self.refresh_button.clicked.connect(self.refresh_backups)
        main_buttons_layout.addWidget(self.refresh_button)

        controls_layout.addLayout(main_buttons_layout)

        # Backup-specific buttons
        backup_buttons_layout = QHBoxLayout()

        self.restore_button = QPushButton('Восстановить')
        self.restore_button.clicked.connect(self.restore_backup)
        self.restore_button.setEnabled(False)
        backup_buttons_layout.addWidget(self.restore_button)

        self.details_button = QPushButton('Подробности')
        self.details_button.clicked.connect(self.show_backup_details)
        self.details_button.setEnabled(False)
        backup_buttons_layout.addWidget(self.details_button)

        self.delete_button = QPushButton('Удалить')
        self.delete_button.clicked.connect(self.delete_backup)
        self.delete_button.setEnabled(False)
        backup_buttons_layout.addWidget(self.delete_button)

        controls_layout.addLayout(backup_buttons_layout)

        # Cleanup button
        cleanup_layout = QHBoxLayout()
        self.cleanup_button = QPushButton('Очистить старые (>30 дней)')
        self.cleanup_button.clicked.connect(self.cleanup_old_backups)
        cleanup_layout.addWidget(self.cleanup_button)
        cleanup_layout.addStretch()
        controls_layout.addLayout(cleanup_layout)

        layout.addWidget(stats_group)
        layout.addWidget(controls_group)

        return widget

    def _create_bottom_section(self) -> QWidget:
        """Create bottom section with backup table."""
        widget = QWidget()
        layout = QVBoxLayout()
        widget.setLayout(layout)

        # Table label
        table_label = QLabel('Доступные резервные копии:')
        table_font = QFont()
        table_font.setBold(True)
        table_label.setFont(table_font)
        layout.addWidget(table_label)

        # Backup table
        self.backup_table = QTableWidget()
        self.backup_table.setColumnCount(7)
        self.backup_table.setHorizontalHeaderLabels(
            [
                'Дата создания',
                'Размер',
                'PostgreSQL',
                'Записей в БД',
                'Возраст (дни)',
                'Статус',
                'Путь',
            ]
        )

        # Table configuration
        self.backup_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.backup_table.setSelectionMode(QAbstractItemView.SingleSelection)
        self.backup_table.setSortingEnabled(True)
        self.backup_table.setAlternatingRowColors(True)

        # Column sizing
        header = self.backup_table.horizontalHeader()
        header.setStretchLastSection(True)
        header.resizeSection(0, 150)  # Date
        header.resizeSection(1, 80)  # Size
        header.resizeSection(2, 80)  # PostgreSQL
        header.resizeSection(3, 100)  # Records
        header.resizeSection(4, 80)  # Age
        header.resizeSection(5, 100)  # Status

        # Connect selection change
        self.backup_table.itemSelectionChanged.connect(self._on_selection_changed)
        self.backup_table.itemDoubleClicked.connect(self.show_backup_details)

        layout.addWidget(self.backup_table)

        return widget

    def _on_progress_update(self, message: str):
        """Handle progress updates from backup operations.

        Args:
            message: Progress message
        """
        # Update status bar or show in progress dialog
        if hasattr(self, 'progress_dialog') and self.progress_dialog:
            self.progress_dialog.setLabelText(message)

    def _on_selection_changed(self):
        """Handle backup table selection change."""
        selected_rows = self.backup_table.selectionModel().selectedRows()

        if selected_rows:
            row = selected_rows[0].row()
            if 0 <= row < len(self.backups):
                self.selected_backup = self.backups[row]

                # Enable backup-specific buttons
                self.restore_button.setEnabled(self.selected_backup.is_valid)
                self.details_button.setEnabled(True)
                self.delete_button.setEnabled(True)
            else:
                self.selected_backup = None
                self._disable_backup_buttons()
        else:
            self.selected_backup = None
            self._disable_backup_buttons()

    def _disable_backup_buttons(self):
        """Disable backup-specific buttons."""
        self.restore_button.setEnabled(False)
        self.details_button.setEnabled(False)
        self.delete_button.setEnabled(False)

    def refresh_backups(self):
        """Refresh backup list."""
        try:
            self.backups = self.backup_manager.get_backups(force_refresh=True)
            self._populate_backup_table()
            self._update_statistics()
        except Exception as e:
            QMessageBox.critical(
                self, 'Ошибка', f'Ошибка обновления списка резервных копий: {str(e)}'
            )

    def _populate_backup_table(self):
        """Populate backup table with data."""
        self.backup_table.setRowCount(len(self.backups))

        for i, backup in enumerate(self.backups):
            # Date
            self.backup_table.setItem(
                i, 0, QTableWidgetItem(backup.formatted_timestamp)
            )

            # Size
            self.backup_table.setItem(i, 1, QTableWidgetItem(backup.formatted_size))

            # PostgreSQL version
            self.backup_table.setItem(i, 2, QTableWidgetItem(backup.pg_version))

            # Total records
            total_records = (
                backup.equipment_count
                + backup.bookings_count
                + backup.clients_count
                + backup.projects_count
            )
            self.backup_table.setItem(i, 3, QTableWidgetItem(str(total_records)))

            # Age
            age_item = QTableWidgetItem(str(backup.age_days))
            if backup.age_days > 30:
                age_item.setBackground(Qt.yellow)
            self.backup_table.setItem(i, 4, age_item)

            # Status
            status_item = QTableWidgetItem(backup.status_display)
            if backup.status == BackupStatus.VALID:
                status_item.setBackground(Qt.green)
            elif backup.status in [BackupStatus.INVALID, BackupStatus.CORRUPTED]:
                status_item.setBackground(Qt.red)
            else:
                status_item.setBackground(Qt.yellow)
            self.backup_table.setItem(i, 5, status_item)

            # Path
            self.backup_table.setItem(i, 6, QTableWidgetItem(backup.path))

        # Clear selection
        self.backup_table.clearSelection()
        self.selected_backup = None
        self._disable_backup_buttons()

    def _update_statistics(self):
        """Update statistics display."""
        try:
            stats = self.backup_manager.get_backup_statistics()

            stats_text = f"""Всего резервных копий: {stats['total_backups']}
Валидных: {stats['valid_backups']}
Общий размер: {stats['total_size_formatted']}"""

            if stats['latest_backup']:
                latest = stats['latest_backup']
                stats_text += f"\nПоследняя копия: {latest.formatted_timestamp}"

            self.stats_label.setText(stats_text)

        except Exception as e:
            self.stats_label.setText(f'Ошибка получения статистики: {str(e)}')

    def create_backup(self):
        """Create new backup."""
        # Check system readiness
        ready, status = self.backup_manager.check_system_ready()
        if not ready:
            QMessageBox.warning(
                self,
                'Система не готова',
                f'Невозможно создать резервную копию: {status}',
            )
            return

        # Confirm operation
        reply = QMessageBox.question(
            self,
            'Создание резервной копии',
            'Создать резервную копию базы данных и данных?\n\nЭто может занять несколько минут.',
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.Yes,
        )

        if reply != QMessageBox.Yes:
            return

        # Show progress dialog
        self.progress_dialog = QProgressDialog(
            'Создание резервной копии...', 'Отмена', 0, 0, self
        )
        self.progress_dialog.setWindowModality(Qt.WindowModal)
        self.progress_dialog.setMinimumDuration(0)

        # Start backup in worker thread
        self.worker = WorkerThread(self.backup_manager.create_backup)
        self.worker.finished_signal.connect(self._on_backup_finished)
        self.worker.start()

    def _on_backup_finished(self, success: bool, message: str):
        """Handle backup operation completion.

        Args:
            success: Whether operation succeeded
            message: Result message
        """
        if hasattr(self, 'progress_dialog'):
            self.progress_dialog.close()

        if success:
            QMessageBox.information(self, 'Успех', message)
            self.refresh_backups()
        else:
            QMessageBox.critical(self, 'Ошибка', message)

    def restore_backup(self):
        """Restore from selected backup."""
        if not self.selected_backup:
            return

        # Confirm operation
        reply = QMessageBox.question(
            self,
            'Восстановление',
            f'Восстановить данные из резервной копии от {self.selected_backup.formatted_timestamp}?\n\n'
            'ВНИМАНИЕ: Все текущие данные будут заменены!',
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No,
        )

        if reply != QMessageBox.Yes:
            return

        # Show progress dialog
        self.progress_dialog = QProgressDialog(
            'Восстановление из резервной копии...', 'Отмена', 0, 0, self
        )
        self.progress_dialog.setWindowModality(Qt.WindowModal)
        self.progress_dialog.setMinimumDuration(0)

        # Start restore in worker thread
        self.worker = WorkerThread(
            self.backup_manager.restore_backup, self.selected_backup
        )
        self.worker.finished_signal.connect(self._on_restore_finished)
        self.worker.start()

    def _on_restore_finished(self, success: bool, message: str):
        """Handle restore operation completion.

        Args:
            success: Whether operation succeeded
            message: Result message
        """
        if hasattr(self, 'progress_dialog'):
            self.progress_dialog.close()

        if success:
            QMessageBox.information(self, 'Успех', message)
        else:
            QMessageBox.critical(self, 'Ошибка', message)

    def delete_backup(self):
        """Delete selected backup."""
        if not self.selected_backup:
            return

        # Confirm operation
        reply = QMessageBox.question(
            self,
            'Удаление резервной копии',
            f'Удалить резервную копию от {self.selected_backup.formatted_timestamp}?\n\n'
            f'Размер: {self.selected_backup.formatted_size}\n'
            'Это действие нельзя отменить!',
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No,
        )

        if reply != QMessageBox.Yes:
            return

        # Delete backup
        success, message = self.backup_manager.delete_backup(self.selected_backup)

        if success:
            QMessageBox.information(self, 'Успех', message)
            self.refresh_backups()
        else:
            QMessageBox.critical(self, 'Ошибка', message)

    def cleanup_old_backups(self):
        """Clean up old backups."""
        # Confirm operation
        reply = QMessageBox.question(
            self,
            'Очистка старых резервных копий',
            'Удалить все резервные копии старше 30 дней?\n\n'
            'Это действие нельзя отменить!',
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No,
        )

        if reply != QMessageBox.Yes:
            return

        # Cleanup old backups
        success, message, deleted_count = self.backup_manager.cleanup_old_backups(30)

        if success:
            QMessageBox.information(
                self, 'Успех', f'{message}\nУдалено: {deleted_count} копий'
            )
            self.refresh_backups()
        else:
            QMessageBox.critical(self, 'Ошибка', message)

    def show_backup_details(self):
        """Show detailed backup information."""
        if not self.selected_backup:
            return

        dialog = BackupDetailsDialog(self.selected_backup, self)
        dialog.exec_()

    def showEvent(self, event):
        """Handle window show event."""
        super().showEvent(event)
        # Start refresh timer when window is shown (30 seconds is fine when window is open)
        if not self.refresh_timer.isActive():
            self.refresh_timer.start(30000)  # 30 seconds

    def hideEvent(self, event):
        """Handle window hide event."""
        super().hideEvent(event)
        # Stop refresh timer when window is hidden to save resources
        self.refresh_timer.stop()

    def closeEvent(self, event):
        """Handle window close event."""
        # Stop refresh timer
        self.refresh_timer.stop()

        # Stop any running worker
        if hasattr(self, 'worker') and self.worker.isRunning():
            self.worker.terminate()
            self.worker.wait()

        event.accept()
