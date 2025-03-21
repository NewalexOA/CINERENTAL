"""Main application module for ACT-Rental Launcher."""

import logging
import os
import sys
import time
from typing import Any, Callable, Optional

from docker_manager import DockerManager
from PyQt5.QtCore import QEvent, QSettings, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QIcon
from PyQt5.QtWidgets import (
    QApplication,
    QFileDialog,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QProgressBar,
    QPushButton,
    QStatusBar,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

# Configure root logger
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()],
)


class WorkerThread(QThread):
    """Worker thread for executing long-running operations."""

    update_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(bool, str)

    def __init__(self, function: Callable, *args: Any, **kwargs: Any) -> None:
        """Initialize worker thread.

        Args:
            function: Function to execute
            *args: Positional arguments for the function
            **kwargs: Keyword arguments for the function
        """
        super().__init__()
        self.function = function
        self.args = args
        self.kwargs = kwargs

    def run(self) -> None:
        """Execute the function in a separate thread."""
        try:
            result = self.function(*self.args, **self.kwargs)
            if isinstance(result, tuple) and len(result) == 2:
                success, message = result
                self.finished_signal.emit(success, message)
            else:
                self.finished_signal.emit(True, 'Операция выполнена успешно')
        except Exception as e:
            self.update_signal.emit(f'Ошибка: {str(e)}')
            self.finished_signal.emit(False, f'Ошибка: {str(e)}')


class LogMonitorThread(QThread):
    """Thread for monitoring the log file."""

    update_signal = pyqtSignal(str)

    def __init__(self, log_file: str) -> None:
        """Initialize log monitor thread.

        Args:
            log_file: Path to log file to monitor
        """
        super().__init__()
        self.log_file = log_file
        self.running = True

    def run(self) -> None:
        """Monitor log file for changes and emit signals with new content."""
        try:
            if not os.path.exists(self.log_file):
                with open(self.log_file, 'w', encoding='utf-8') as f:
                    f.write('Лог-файл создан\n')

            with open(self.log_file, 'r', encoding='utf-8') as f:
                f.seek(0, 2)  # Move to the end of file

                while self.running:
                    line = f.readline()
                    if line:
                        self.update_signal.emit(line)
                    else:
                        time.sleep(0.5)  # Pause before next check
        except Exception as e:
            self.update_signal.emit(f'Ошибка мониторинга лога: {str(e)}')

    def stop(self) -> None:
        """Stop the monitoring thread."""
        self.running = False


class MainWindow(QMainWindow):
    """Main application window for ACT-Rental Launcher."""

    def __init__(self) -> None:
        """Initialize the main window."""
        super().__init__()

        # Load settings
        self.settings = QSettings('ACT-Rental', 'Launcher')

        # Get project path or ask user to select it if not defined
        project_path = self.settings.value('project_path', None, str)
        if not project_path or not os.path.isdir(project_path):
            project_path = self.select_project_path()
            if project_path:
                self.settings.setValue('project_path', project_path)

        # Initialize Docker manager with the project path
        self.docker = DockerManager(project_path=project_path)
        self.log_monitor_thread = None

        # Initialize UI and check status
        self.init_ui()
        self.start_log_monitor()
        self.check_status()  # Check Docker status on startup

    def select_project_path(self) -> Optional[str]:
        """Prompt user to select the ACT-Rental project path.

        Returns:
            Optional[str]: The selected path or None if user cancels
        """
        # Default path suggestion
        default_path = os.path.expanduser('~')

        # Show information dialog
        QMessageBox.information(
            self,
            'Выбор пути проекта',
            'Пожалуйста, выберите папку, где находится проект ACT-Rental.\n'
            'Это папка, содержащая файл docker-compose.yml '
            'или docker-compose.prod.yml.',
        )

        # Open directory selection dialog
        project_path = (
            str(
                QFileDialog.getExistingDirectory(
                    self,
                    'Выберите папку проекта ACT-Rental',
                    default_path,
                    QFileDialog.ShowDirsOnly | QFileDialog.DontResolveSymlinks,
                )
            )
            or None
        )

        if not project_path:
            # User canceled, show warning and offer to use default path
            reply = QMessageBox.question(
                self,
                'Использовать путь по умолчанию?',
                'Вы не выбрали путь к проекту ACT-Rental. '
                'Хотите использовать путь по умолчанию?\n\n'
                '~/Github/ACT-Rental',
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.Yes,
            )

            if reply == QMessageBox.Yes:
                return os.path.expanduser('~/Github/ACT-Rental')
            return None

        return project_path

    def init_ui(self) -> None:
        """Initialize user interface components."""
        self.setWindowTitle('ACT-Rental Launcher')
        self.setMinimumSize(800, 600)

        # Set window icon
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        icon_path = os.path.join(base_dir, 'assets', 'icon.iconset', 'icon.icns')
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        # Set up menubar
        menubar = self.menuBar()
        file_menu = menubar.addMenu('Файл')

        # Add menu actions
        change_path_action = file_menu.addAction('Изменить путь проекта')
        change_path_action.triggered.connect(self.change_project_path)

        file_menu.addSeparator()
        exit_action = file_menu.addAction('Выход')
        exit_action.triggered.connect(self.close)

        # Main layout setup
        main_widget = QWidget()
        main_layout = QVBoxLayout()
        main_widget.setLayout(main_layout)
        self.setCentralWidget(main_widget)

        header_layout = QHBoxLayout()
        logo_label = QLabel()
        # A logo can be added here if available
        # logo_pixmap = QPixmap("assets/logo.png")
        # logo_label.setPixmap(logo_pixmap.scaled(64, 64, Qt.KeepAspectRatio))

        title_label = QLabel('ACT-Rental Launcher')
        title_font = QFont()
        title_font.setPointSize(18)
        title_font.setBold(True)
        title_label.setFont(title_font)

        header_layout.addWidget(logo_label)
        header_layout.addWidget(title_label)
        header_layout.addStretch()

        main_layout.addLayout(header_layout)

        control_group = QGroupBox('Управление')
        control_layout = QVBoxLayout()
        control_group.setLayout(control_layout)

        self.status_label = QLabel('Проверка статуса...')
        status_font = QFont()
        status_font.setPointSize(12)
        self.status_label.setFont(status_font)
        control_layout.addWidget(self.status_label)

        buttons_layout = QHBoxLayout()

        self.start_button = QPushButton('Запустить')
        self.start_button.clicked.connect(self.start_containers)

        self.stop_button = QPushButton('Остановить')
        self.stop_button.clicked.connect(self.stop_containers)

        self.restart_button = QPushButton('Перезапустить')
        self.restart_button.clicked.connect(self.restart_containers)

        self.open_button = QPushButton('Открыть в браузере')
        self.open_button.clicked.connect(self.open_in_browser)

        buttons_layout.addWidget(self.start_button)
        buttons_layout.addWidget(self.stop_button)
        buttons_layout.addWidget(self.restart_button)
        buttons_layout.addWidget(self.open_button)

        control_layout.addLayout(buttons_layout)

        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        control_layout.addWidget(self.progress_bar)

        main_layout.addWidget(control_group)

        logs_group = QGroupBox('Логи')
        logs_layout = QVBoxLayout()
        logs_group.setLayout(logs_layout)

        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        logs_layout.addWidget(self.log_text)

        log_buttons_layout = QHBoxLayout()

        clear_log_button = QPushButton('Очистить логи')
        clear_log_button.clicked.connect(self.clear_logs)

        view_docker_logs_button = QPushButton('Показать логи контейнера')
        view_docker_logs_button.clicked.connect(self.show_container_logs)

        log_buttons_layout.addWidget(clear_log_button)
        log_buttons_layout.addWidget(view_docker_logs_button)
        logs_layout.addLayout(log_buttons_layout)

        main_layout.addWidget(logs_group)

        # Create status bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)

        # Show project path in status bar
        path_label = QLabel(f'Путь проекта: {self.docker.project_path}')
        self.status_bar.addPermanentWidget(path_label)

    def start_log_monitor(self) -> None:
        """Start log file monitoring."""
        self.log_monitor = LogMonitorThread(self.docker.log_file)
        self.log_monitor.update_signal.connect(self.update_log)
        self.log_monitor.start()

    def update_log(self, text: str) -> None:
        """Update log display with new text."""
        self.log_text.append(text.strip())
        scrollbar = self.log_text.verticalScrollBar()
        if scrollbar is not None:
            scrollbar.setValue(scrollbar.maximum())

    def clear_logs(self) -> None:
        """Clear log display."""
        self.log_text.clear()

    def check_status(self) -> None:
        """Check Docker and containers status."""
        self.status_bar.showMessage('Проверка статуса Docker и контейнеров...')

        if not self.docker.is_docker_running():
            self.status_label.setText('Docker не запущен')
            self.status_label.setStyleSheet('color: red;')
            self.update_buttons_state(False)
            self.status_bar.showMessage('Docker не запущен. Запустите Docker Desktop.')
            return

        if self.docker.check_act_rental_running():
            self.status_label.setText('ACT-Rental запущен и работает')
            self.status_label.setStyleSheet('color: green;')
            self.update_buttons_state(True, running=True)
            self.status_bar.showMessage('ACT-Rental запущен и готов к работе')
        else:
            self.status_label.setText('ACT-Rental не запущен')
            self.status_label.setStyleSheet('color: orange;')
            self.update_buttons_state(True, running=False)
            self.status_bar.showMessage('ACT-Rental не запущен. Нажмите "Запустить".')

    def update_buttons_state(self, docker_running: bool, running: bool = False) -> None:
        """Update UI button states based on Docker and containers status."""
        self.start_button.setEnabled(docker_running and not running)
        self.stop_button.setEnabled(docker_running and running)
        self.restart_button.setEnabled(docker_running and running)
        self.open_button.setEnabled(running)

    def start_containers(self) -> None:
        """Start ACT-Rental containers."""
        self.status_bar.showMessage('Запуск контейнеров...')
        self.status_label.setText('Запуск контейнеров...')
        self.status_label.setStyleSheet('color: orange;')

        self.update_buttons_state(False)

        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # Infinite progress

        self.worker = WorkerThread(self.docker.start_containers)
        self.worker.update_signal.connect(self.update_log)
        self.worker.finished_signal.connect(self.on_start_finished)
        self.worker.start()

    def on_start_finished(self, success: bool, message: str) -> None:
        """Handle container start operation completion."""
        self.progress_bar.setVisible(False)

        if success:
            self.status_label.setText('ACT-Rental запущен и работает')
            self.status_label.setStyleSheet('color: green;')
            self.update_buttons_state(True, running=True)
            self.status_bar.showMessage(message)

            reply = QMessageBox.question(
                self,
                'Открыть в браузере',
                'Приложение успешно запущено. Открыть его в браузере?',
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.Yes,
            )

            if reply == QMessageBox.Yes:
                self.open_in_browser()
        else:
            self.status_label.setText('Ошибка при запуске ACT-Rental')
            self.status_label.setStyleSheet('color: red;')
            self.update_buttons_state(True, running=False)
            self.status_bar.showMessage(message)

            QMessageBox.critical(
                self,
                'Ошибка запуска',
                f'Не удалось запустить ACT-Rental: {message}',
            )

    def stop_containers(self) -> None:
        """Stop ACT-Rental containers."""
        reply = QMessageBox.question(
            self,
            'Подтверждение',
            'Вы уверены, что хотите остановить ACT-Rental?',
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No,
        )

        if reply != QMessageBox.Yes:
            return

        self.status_bar.showMessage('Остановка контейнеров...')
        self.status_label.setText('Остановка контейнеров...')
        self.status_label.setStyleSheet('color: orange;')

        self.update_buttons_state(False)

        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # Infinite progress

        self.worker = WorkerThread(self.docker.stop_containers)
        self.worker.update_signal.connect(self.update_log)
        self.worker.finished_signal.connect(self.on_stop_finished)
        self.worker.start()

    def on_stop_finished(self, success: bool, message: str) -> None:
        """Handle container stop operation completion."""
        self.progress_bar.setVisible(False)

        if success:
            self.status_label.setText('ACT-Rental остановлен')
            self.status_label.setStyleSheet('color: orange;')
            self.update_buttons_state(True, running=False)
            self.status_bar.showMessage(message)
        else:
            self.status_label.setText('Ошибка при остановке ACT-Rental')
            self.status_label.setStyleSheet('color: red;')
            self.check_status()
            self.status_bar.showMessage(message)

            QMessageBox.critical(
                self,
                'Ошибка остановки',
                f'Не удалось остановить ACT-Rental: {message}',
            )

    def restart_containers(self) -> None:
        """Restart ACT-Rental containers."""
        reply = QMessageBox.question(
            self,
            'Подтверждение',
            'Вы уверены, что хотите перезапустить ACT-Rental?',
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No,
        )

        if reply != QMessageBox.Yes:
            return

        self.status_bar.showMessage('Перезапуск контейнеров...')
        self.status_label.setText('Перезапуск контейнеров...')
        self.status_label.setStyleSheet('color: orange;')

        self.update_buttons_state(False)

        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # Infinite progress

        self.worker = WorkerThread(self.docker.restart_containers)
        self.worker.update_signal.connect(self.update_log)
        self.worker.finished_signal.connect(self.on_restart_finished)
        self.worker.start()

    def on_restart_finished(self, success: bool, message: str) -> None:
        """Handle container restart operation completion."""
        self.progress_bar.setVisible(False)

        if success:
            self.status_label.setText('ACT-Rental запущен и работает')
            self.status_label.setStyleSheet('color: green;')
            self.update_buttons_state(True, running=True)
            self.status_bar.showMessage(message)
        else:
            self.status_label.setText('Ошибка при перезапуске ACT-Rental')
            self.status_label.setStyleSheet('color: red;')
            self.check_status()
            self.status_bar.showMessage(message)

            QMessageBox.critical(
                self,
                'Ошибка перезапуска',
                f'Не удалось перезапустить ACT-Rental: {message}',
            )

    def open_in_browser(self) -> None:
        """Open application in browser."""
        if self.docker.open_in_browser():
            self.status_bar.showMessage('Приложение открыто в браузере')
        else:
            self.status_bar.showMessage('Ошибка при открытии браузера')
            QMessageBox.warning(
                self, 'Ошибка', 'Не удалось открыть приложение в браузере'
            )

    def show_container_logs(self) -> None:
        """Show container logs."""
        logs = self.docker.get_container_logs()

        log_dialog = QMainWindow(self)
        log_dialog.setWindowTitle('Логи контейнера')
        log_dialog.setMinimumSize(700, 500)

        central_widget = QWidget()
        layout = QVBoxLayout()
        central_widget.setLayout(layout)

        log_text = QTextEdit()
        log_text.setReadOnly(True)
        log_text.setPlainText(logs)
        layout.addWidget(log_text)

        close_button = QPushButton('Закрыть')

        def close_dialog() -> None:
            log_dialog.close()

        close_button.clicked.connect(close_dialog)
        layout.addWidget(close_button)

        log_dialog.setCentralWidget(central_widget)
        log_dialog.show()

    def closeEvent(self, event: Optional[QEvent]) -> None:
        """Handle window close event."""
        if hasattr(self, 'log_monitor'):
            self.log_monitor.stop()
            self.log_monitor.wait()

        if event:
            event.accept()

    def change_project_path(self) -> None:
        """Change the project path and restart the application."""
        # Ask user to select a new path
        new_path = self.select_project_path()

        if new_path:
            # Save the new path
            self.settings.setValue('project_path', new_path)

            # Show restart message
            QMessageBox.information(
                self,
                'Перезапуск приложения',
                'Путь проекта изменен. '
                'Приложение будет перезапущено для применения изменений.',
            )

            # Restart the application
            python = sys.executable
            os.execl(python, python, *sys.argv)


if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
