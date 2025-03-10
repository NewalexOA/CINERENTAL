"""Docker manager for CINERENTAL application."""

import logging
import os
import subprocess
import time
from typing import Optional, Tuple, Union


class DockerManager:
    """Docker container manager for CINERENTAL."""

    def __init__(
        self,
        project_path: Optional[str] = None,
        compose_file: str = 'docker-compose.prod.yml',
        log_folder: Optional[str] = None,
    ) -> None:
        """Initialize Docker manager.

        Args:
            project_path: Path to CINERENTAL project directory
            compose_file: Docker compose file name
            log_folder: Path to log folder
        """
        self.project_path = project_path or os.path.expanduser('~/Github/CINERENTAL')
        self.compose_file = compose_file

        self.log_folder = log_folder or os.path.join(self.project_path, 'logs')
        os.makedirs(self.log_folder, exist_ok=True)

        self.log_file = os.path.join(self.log_folder, 'cinerental_launcher.log')
        self.setup_log_file = os.path.join(self.log_folder, 'setup_output.log')

        self.setup_logger()
        self.app_url = 'http://localhost:8000'

        self.logger.info(
            f'DockerManager инициализирован. Путь проекта: {self.project_path}'
        )
        self.logger.info(f'Файл docker-compose: {self.compose_file}')

    def setup_logger(self) -> None:
        """Configure logger."""
        self.logger = logging.getLogger('DockerManager')
        self.logger.setLevel(logging.DEBUG)

        file_handler = logging.FileHandler(self.log_file)
        file_handler.setLevel(logging.DEBUG)

        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def run_command(
        self, command: str, capture_output: bool = True, check: bool = False
    ) -> Union[subprocess.CompletedProcess, subprocess.CalledProcessError, None]:
        """Execute shell command.

        Args:
            command: Command to execute
            capture_output: Whether to capture output
            check: Whether to check return code

        Returns:
            Command execution result (stdout, stderr, returncode)
        """
        self.logger.debug(f'Выполнение команды: {command}')

        try:
            cwd = os.getcwd()
            os.chdir(self.project_path)

            env = os.environ.copy()
            paths = [
                '/usr/local/bin',
                '/usr/bin',
                '/bin',
                '/usr/sbin',
                '/sbin',
                '/opt/homebrew/bin',
            ]
            path_string = ':'.join(paths)
            env['PATH'] = path_string + ((':' + env['PATH']) if 'PATH' in env else '')

            result = subprocess.run(
                command,
                shell=True,
                capture_output=capture_output,
                text=True,
                check=check,
                env=env,
            )

            os.chdir(cwd)

            if result.returncode == 0:
                self.logger.debug(f'Команда выполнена успешно: {command}')
            else:
                self.logger.warning(
                    f'Команда завершилась с ошибкой (код {result.returncode}): '
                    f'{command}'
                )
                self.logger.warning(f'Stderr: {result.stderr}')

            return result

        except subprocess.CalledProcessError as e:
            self.logger.error(f'Ошибка при выполнении команды: {command}')
            self.logger.error(f'Сообщение: {str(e)}')
            return e
        except Exception as e:
            self.logger.error(f'Неожиданная ошибка при выполнении команды: {command}')
            self.logger.error(f'Сообщение: {str(e)}')
            return None

    def is_docker_running(self) -> bool:
        """Check if Docker daemon is running."""
        docker_paths = [
            '/usr/local/bin/docker',
            '/opt/homebrew/bin/docker',
            'docker',  # For backward compatibility
        ]

        for docker_path in docker_paths:
            cmd = f'{docker_path} info > /dev/null 2>&1'
            result = self.run_command(cmd, capture_output=False)
            if result and result.returncode == 0:
                return True

        self.logger.warning('Docker не найден или не запущен')
        return False

    def check_cinerental_running(self) -> bool:
        """Check if CINERENTAL containers are running."""
        if not self.is_docker_running():
            self.logger.warning('Docker не запущен')
            return False

        docker_compose_cmd = self.get_docker_compose_cmd()

        cmd = f'{docker_compose_cmd} ps -a --format "{{{{.Service}}}}" | wc -l | xargs'
        result = self.run_command(cmd)

        if not result or result.returncode != 0:
            self.logger.error('Ошибка при проверке контейнеров')
            return False

        try:
            container_count = int(result.stdout.strip())
            self.logger.info(f'Найдено контейнеров: {container_count}')

            if container_count > 0:
                cmd = (
                    f'{docker_compose_cmd} ps --services '
                    f'--filter "status=running" | grep -q "web" && '
                    f'echo "running" || echo "not-running"'
                )
                result = self.run_command(cmd)

                if result and result.stdout.strip() == 'running':
                    self.logger.info('CINERENTAL веб-сервис запущен')

                    curl_cmd = (
                        f'curl -s -o /dev/null '
                        f'-w "%{{http_code}}" --max-time 3 {self.app_url} '
                        f'|| echo "error"'
                    )
                    web_check = self.run_command(curl_cmd)

                    if web_check and (
                        web_check.stdout.startswith('2')
                        or web_check.stdout in ['301', '302']
                    ):
                        self.logger.info(
                            f'CINERENTAL уже запущен и веб-интерфейс доступен '
                            f'(код {web_check.stdout})'
                        )
                        return True
                    else:
                        code_value = web_check.stdout if web_check else 'неизвестно'
                        self.logger.warning(
                            'CINERENTAL веб-сервис запущен, но '
                            'веб-интерфейс не отвечает '
                            f'(код {code_value})'
                        )
                        return False
                else:
                    self.logger.info('Контейнеры CINERENTAL существуют, но не запущены')
                    return False
            else:
                self.logger.info('Контейнеры CINERENTAL не созданы')
                return False

        except ValueError:
            if result and hasattr(result, 'stdout'):
                self.logger.error(
                    'Не удалось определить количество контейнеров. '
                    f'Вывод: {result.stdout}'
                )
            else:
                self.logger.error(
                    'Не удалось определить количество контейнеров: нет данных'
                )
            return False

    def get_docker_compose_cmd(self) -> str:
        """Get Docker Compose command with proper options."""
        docker_compose_paths = [
            '/usr/local/bin/docker compose',
            '/opt/homebrew/bin/docker compose',
            'docker compose',
        ]

        for path in docker_compose_paths:
            test_cmd = f'{path} version > /dev/null 2>&1'
            result = self.run_command(test_cmd, capture_output=False)
            if result and result.returncode == 0:
                return f'{path} -f {self.compose_file}'

        self.logger.warning(
            'Не удалось определить путь к docker compose, используем стандартный'
        )
        return f'docker compose -f {self.compose_file}'

    def start_containers(self) -> Tuple[bool, str]:
        """Start CINERENTAL containers."""
        self.logger.info('Запуск контейнеров CINERENTAL...')

        if not self.is_docker_running():
            self.logger.error('Docker не запущен. Невозможно запустить контейнеры.')
            return (
                False,
                'Docker не запущен. Пожалуйста, запустите Docker Desktop.',
            )

        compose_path = os.path.join(self.project_path, self.compose_file)
        if not os.path.exists(compose_path):
            self.logger.error(
                f'Файл {self.compose_file} не найден в {self.project_path}'
            )
            return (
                False,
                f'Файл {self.compose_file} не найден. Проверьте путь к проекту.',
            )

        volumes_result, volumes_message = self.ensure_docker_volumes()
        if not volumes_result:
            return False, volumes_message

        docker_compose_cmd = self.get_docker_compose_cmd()

        result = self.run_command(f'{docker_compose_cmd} up -d')

        if result and result.returncode == 0:
            self.logger.info('Контейнеры успешно запущены')

            timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
            with open(self.setup_log_file, 'a', encoding='utf-8') as f:
                f.write('============================================\n')
                f.write(f'Контейнеры CINERENTAL запущены {timestamp}\n')
                f.write('✓ Приложение успешно запущено\n')
                f.write('============================================\n')

            self.logger.info('Ожидание запуска веб-интерфейса...')
            for _ in range(10):
                time.sleep(2)
                web_check = self.run_command(
                    f'curl -s -o /dev/null -w "%{{http_code}}" --max-time 3 '
                    f'{self.app_url} || echo "error"'
                )

                if web_check and (
                    web_check.stdout.startswith('2')
                    or web_check.stdout in ['301', '302']
                ):
                    self.logger.info(f'Веб-интерфейс доступен (код {web_check.stdout})')
                    return (
                        True,
                        'Контейнеры успешно запущены. Веб-интерфейс доступен.',
                    )

            self.logger.warning('Контейнеры запущены, но веб-интерфейс не отвечает')
            return (
                True,
                'Контейнеры запущены, но веб-интерфейс пока не отвечает. '
                'Возможно, приложение все еще инициализируется.',
            )
        else:
            error_msg = (
                result.stderr
                if result and hasattr(result, 'stderr')
                else 'Неизвестная ошибка'
            )
            self.logger.error(f'Ошибка при запуске контейнеров: {error_msg}')
            return False, f'Ошибка при запуске контейнеров: {error_msg}'

    def ensure_docker_volumes(self) -> Tuple[bool, str]:
        """Ensure all required Docker volumes exist."""
        self.logger.info('Проверка и создание Docker-томов...')

        try:
            volumes_cmd = 'docker volume ls --format "{{.Name}}" | grep cinerental'
            result = self.run_command(volumes_cmd)

            required_volumes = [
                'cinerental_postgres_data',
                'cinerental_redis_data',
                'cinerental_media',
            ]
            existing_volumes = []

            if result and result.returncode == 0 and result.stdout:
                existing_volumes = result.stdout.strip().split('\n')
                self.logger.info(f'Найдены существующие тома: {existing_volumes}')

            volumes_to_create = [
                vol for vol in required_volumes if vol not in existing_volumes
            ]

            if not volumes_to_create:
                self.logger.info('Все необходимые тома уже существуют')
                return True, 'Все необходимые Docker-тома уже существуют'

            self.logger.info(f'Создание отсутствующих томов: {volumes_to_create}')

            for volume in volumes_to_create:
                create_cmd = f'docker volume create {volume}'
                create_result = self.run_command(create_cmd)

                if create_result and create_result.returncode == 0:
                    self.logger.info(f'Том {volume} успешно создан')
                else:
                    error_msg = f'Не удалось создать том {volume}' + (
                        f': {create_result.stderr}'
                        if create_result and create_result.stderr
                        else ''
                    )
                    self.logger.error(error_msg)
                    return (
                        False,
                        f'Ошибка создания Docker-тома {volume}',
                    )

            with open(self.setup_log_file, 'a', encoding='utf-8') as f:
                f.write(f'Docker volumes created: {", ".join(volumes_to_create)}\n')

            return (
                True,
                f'Docker-тома успешно созданы: {", ".join(volumes_to_create)}',
            )

        except Exception as e:
            error_msg = f'Ошибка при работе с Docker-томами: {str(e)}'
            self.logger.error(error_msg)
            return False, error_msg

    def stop_containers(self) -> Tuple[bool, str]:
        """Stop CINERENTAL containers without removing them."""
        self.logger.info('Остановка контейнеров CINERENTAL...')

        docker_compose_cmd = self.get_docker_compose_cmd()

        # Using 'stop' instead of 'down' to keep containers
        result = self.run_command(f'{docker_compose_cmd} stop')

        if result and result.returncode == 0:
            self.logger.info('Контейнеры успешно остановлены')
            return True, 'Контейнеры успешно остановлены'
        else:
            error_msg = (
                result.stderr
                if result and hasattr(result, 'stderr')
                else 'Неизвестная ошибка'
            )
            self.logger.error(f'Ошибка при остановке контейнеров: {error_msg}')
            return False, f'Ошибка при остановке контейнеров: {error_msg}'

    def down_containers(self) -> Tuple[bool, str]:
        """Stop and remove CINERENTAL containers."""
        self.logger.info('Остановка и удаление контейнеров CINERENTAL...')

        docker_compose_cmd = self.get_docker_compose_cmd()

        result = self.run_command(f'{docker_compose_cmd} down')

        if result and result.returncode == 0:
            self.logger.info('Контейнеры успешно остановлены и удалены')
            return True, 'Контейнеры успешно остановлены и удалены'
        else:
            error_msg = (
                result.stderr
                if result and hasattr(result, 'stderr')
                else 'Неизвестная ошибка'
            )
            self.logger.error(
                f'Ошибка при остановке и удалении контейнеров: {error_msg}'
            )
            return False, f'Ошибка при остановке и удалении контейнеров: {error_msg}'

    def restart_containers(self) -> Tuple[bool, str]:
        """Restart CINERENTAL containers."""
        self.logger.info('Перезапуск контейнеров CINERENTAL...')

        docker_compose_cmd = self.get_docker_compose_cmd()

        # Using the dedicated 'restart' command instead of stop+start
        result = self.run_command(f'{docker_compose_cmd} restart')

        if result and result.returncode == 0:
            self.logger.info('Контейнеры успешно перезапущены')
            return True, 'Контейнеры успешно перезапущены'
        else:
            error_msg = (
                result.stderr
                if result and hasattr(result, 'stderr')
                else 'Неизвестная ошибка'
            )
            self.logger.error(f'Ошибка при перезапуске контейнеров: {error_msg}')
            return False, f'Ошибка при перезапуске контейнеров: {error_msg}'

    def open_in_browser(self) -> bool:
        """Open CINERENTAL in web browser."""
        self.logger.info(f'Открытие приложения в браузере: {self.app_url}')

        result = self.run_command(f'open {self.app_url}')

        if result and result.returncode == 0:
            self.logger.info('Браузер успешно открыт')
            return True
        else:
            self.logger.error('Ошибка при открытии браузера')
            return False

    def get_container_logs(self, service: str = 'web', lines: int = 50) -> str:
        """Get logs from a specific container."""
        self.logger.info(f'Получение логов для контейнера {service}...')

        docker_compose_cmd = self.get_docker_compose_cmd()

        result = self.run_command(f'{docker_compose_cmd} logs --tail {lines} {service}')

        if result and result.returncode == 0 and hasattr(result, 'stdout'):
            return str(result.stdout)
        else:
            return 'Ошибка при получении логов'
