"""Backup control group for main window integration."""

from typing import Any, Callable, Optional

from PyQt5.QtCore import pyqtSignal
from PyQt5.QtGui import QFont
from PyQt5.QtWidgets import (
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QProgressBar,
    QPushButton,
    QSizePolicy,
    QVBoxLayout,
)


class BackupGroup(QGroupBox):
    """Backup control group widget for main window."""

    # Signals for backup operations
    backup_requested = pyqtSignal()
    manage_requested = pyqtSignal()
    restore_requested = pyqtSignal()

    def __init__(self, parent=None) -> None:
        """Initialize backup group widget.

        Args:
            parent: Parent widget
        """
        super().__init__('Резервное копирование', parent)

        self._backup_manager = None
        self._status_callback: Optional[Callable[[str], None]] = None

        self.init_ui()
        self.update_status('Проверка состояния...')

    def init_ui(self) -> None:
        """Initialize user interface."""
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Status label
        self.status_label = QLabel('Проверка состояния...')
        status_font = QFont()
        status_font.setPointSize(10)
        self.status_label.setFont(status_font)
        self.status_label.setWordWrap(True)
        layout.addWidget(self.status_label)

        # Buttons layout
        buttons_layout = QHBoxLayout()

        # Create backup button
        self.create_backup_button = QPushButton('Создать резервную копию')
        self.create_backup_button.clicked.connect(self._on_backup_requested)
        self.create_backup_button.setToolTip(
            'Создать полную резервную копию базы данных и данных'
        )
        buttons_layout.addWidget(self.create_backup_button)

        # Manage backups button
        self.manage_button = QPushButton('Управление')
        self.manage_button.clicked.connect(self._on_manage_requested)
        self.manage_button.setToolTip('Открыть окно управления резервными копиями')
        buttons_layout.addWidget(self.manage_button)

        # Quick restore button (will be enabled when recent backup exists)
        self.quick_restore_button = QPushButton('Быстрое восстановление')
        self.quick_restore_button.clicked.connect(self._on_restore_requested)
        self.quick_restore_button.setToolTip(
            'Восстановить из последней резервной копии'
        )
        self.quick_restore_button.setEnabled(False)  # Disabled by default
        buttons_layout.addWidget(self.quick_restore_button)

        layout.addLayout(buttons_layout)

        # Progress bar (hidden by default)
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)

        # Set size policy
        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)

    def set_backup_manager(self, backup_manager: Any) -> None:
        """Set backup manager instance.

        Args:
            backup_manager: BackupManager instance
        """
        self._backup_manager = backup_manager
        # Update status when manager is set
        self.refresh_status()

    def set_status_callback(self, callback: Callable[[str], None]) -> None:
        """Set callback for status updates.

        Args:
            callback: Function to call with status messages
        """
        self._status_callback = callback

    def refresh_status(self) -> None:
        """Refresh backup status display."""
        if not self._backup_manager:
            self.update_status('Backup manager не инициализирован')
            return

        try:
            # Use quick status to avoid heavy operations during initialization
            status_summary = self._backup_manager.get_quick_status_summary()

            # Update status label
            status_text = status_summary['status_message']
            if status_summary['total_backups'] > 0:
                status_text += f" (всего: {status_summary['total_backups']})"

            self.update_status(status_text)

            # Update button states
            system_ready = status_summary['system_ready']
            has_valid_backups = status_summary['valid_backups'] > 0

            self.create_backup_button.setEnabled(system_ready)
            self.manage_button.setEnabled(True)  # Always available
            self.quick_restore_button.setEnabled(system_ready and has_valid_backups)

        except Exception as e:
            self.update_status(f"Ошибка обновления статуса: {str(e)}")
            # Disable all buttons on error
            self.create_backup_button.setEnabled(False)
            self.manage_button.setEnabled(False)
            self.quick_restore_button.setEnabled(False)

    def refresh_full_status(self) -> None:
        """Refresh backup status display with full information (heavy operation)."""
        if not self._backup_manager:
            self.update_status("Backup manager не инициализирован")
            return

        try:
            # Use full status summary for complete information
            status_summary = self._backup_manager.get_backup_status_summary()

            # Update status label
            status_text = status_summary['status_message']
            if status_summary['total_backups'] > 0:
                status_text += f" (всего: {status_summary['total_backups']})"

            self.update_status(status_text)

            # Update button states
            system_ready = status_summary['system_ready']
            has_valid_backups = status_summary['valid_backups'] > 0

            self.create_backup_button.setEnabled(system_ready)
            self.manage_button.setEnabled(True)  # Always available
            self.quick_restore_button.setEnabled(system_ready and has_valid_backups)

            # Update status colors
            overall_status = status_summary['overall_status']
            if overall_status == 'up_to_date':
                self.status_label.setStyleSheet('color: green;')
            elif overall_status in ['outdated', 'no_backups']:
                self.status_label.setStyleSheet('color: orange;')
            elif overall_status == 'system_not_ready':
                self.status_label.setStyleSheet('color: red;')
            else:
                self.status_label.setStyleSheet('color: black;')

        except Exception as e:
            self.update_status(f"Ошибка обновления статуса: {str(e)}")
            self.status_label.setStyleSheet('color: red;')
            # Disable all buttons on error
            self.create_backup_button.setEnabled(False)
            self.manage_button.setEnabled(False)
            self.quick_restore_button.setEnabled(False)

    def update_status(self, message: str) -> None:
        """Update status label.

        Args:
            message: Status message to display
        """
        self.status_label.setText(message)

        # Call status callback if set
        if self._status_callback:
            self._status_callback(message)

    def show_progress(self, show: bool = True) -> None:
        """Show or hide progress bar.

        Args:
            show: True to show progress bar, False to hide
        """
        self.progress_bar.setVisible(show)
        if show:
            self.progress_bar.setRange(0, 0)  # Indeterminate progress

        # Disable buttons during operation
        self.create_backup_button.setEnabled(not show)
        self.quick_restore_button.setEnabled(not show)

    def _on_backup_requested(self) -> None:
        """Handle backup request."""
        self.backup_requested.emit()

    def _on_manage_requested(self) -> None:
        """Handle manage request."""
        self.manage_requested.emit()

    def _on_restore_requested(self) -> None:
        """Handle restore request."""
        self.restore_requested.emit()
