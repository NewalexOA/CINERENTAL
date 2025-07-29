"""Docker manager for ACT-Rental application."""

import logging
import os
import subprocess
import time
from typing import Optional, Tuple, Union


class DockerManager:
    """Docker container manager for ACT-Rental."""

    def __init__(
        self,
        project_path: Optional[str] = None,
        compose_file: str = 'docker-compose.prod.yml',
        log_folder: Optional[str] = None,
    ) -> None:
        """Initialize Docker manager.

        Args:
            project_path: Path to ACT-Rental project directory
            compose_file: Docker compose file name
            log_folder: Path to log folder
        """
        self.project_path = project_path or os.path.expanduser('~/Github/CINERENTAL')
        self.compose_file = compose_file

        self.log_folder = log_folder or os.path.join(self.project_path, 'logs')
        os.makedirs(self.log_folder, exist_ok=True)

        self.log_file = os.path.join(self.log_folder, 'act-rental_launcher.log')
        self.setup_log_file = os.path.join(self.log_folder, 'setup_output.log')

        self.setup_logger()
        self.app_url = 'http://localhost:8000'

        # Initialize backup manager (lazy loading)
        self._backup_manager = None

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

            # Check if it's a build command which might need real-time output
            if 'build' in command and capture_output:
                self.logger.debug(
                    'Выполнение команды сборки с выводом в реальном времени'
                )
                with open(
                    os.path.join(self.log_folder, 'build_output.log'), 'w'
                ) as build_log:
                    process = subprocess.Popen(
                        command,
                        shell=True,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        env=env,
                        bufsize=1,
                        universal_newlines=True,
                    )

                    stdout_lines = []
                    stderr_lines = []

                    # Process stdout
                    if process.stdout:
                        for line in process.stdout:
                            line = line.rstrip()
                            stdout_lines.append(line)
                            build_log.write(line + '\n')
                            build_log.flush()
                            self.logger.debug(f'BUILD OUT: {line}')
                    else:
                        self.logger.warning('No stdout from build process')

                    # Process stderr
                    if process.stderr:
                        for line in process.stderr:
                            line = line.rstrip()
                            stderr_lines.append(line)
                            build_log.write(f'ERROR: {line}\n')
                            build_log.flush()
                            self.logger.error(f'BUILD ERROR: {line}')
                    else:
                        self.logger.warning('No stderr from build process')

                    process.wait()
                    returncode = process.returncode

                    # Create a CompletedProcess-like object for compatibility
                    result = subprocess.CompletedProcess(
                        args=command,
                        returncode=returncode,
                        stdout='\n'.join(stdout_lines),
                        stderr='\n'.join(stderr_lines),
                    )

                    if returncode == 0:
                        self.logger.debug(
                            f'Команда сборки выполнена успешно: {command}'
                        )
                    else:
                        self.logger.warning(
                            f'Команда сборки завершилась с ошибкой '
                            f'(код {returncode}): {command}'
                        )
                        self.logger.warning(f'Stderr: {result.stderr}')

                    os.chdir(cwd)
                    return result
            else:
                # Standard execution for non-build commands
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
                    if hasattr(result, 'stderr') and result.stderr:
                        self.logger.warning(f'Stderr: {result.stderr}')
                    if hasattr(result, 'stdout') and result.stdout:
                        self.logger.debug(f'Stdout: {result.stdout}')

                return result

        except subprocess.CalledProcessError as e:
            self.logger.error(f'Ошибка при выполнении команды: {command}')
            self.logger.error(f'Сообщение: {str(e)}')
            if hasattr(e, 'stderr') and e.stderr:
                self.logger.error(f'Stderr: {e.stderr}')
            if hasattr(e, 'stdout') and e.stdout:
                self.logger.debug(f'Stdout: {e.stdout}')
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

    def check_act_rental_running(self) -> bool:
        """Check if ACT-Rental containers are running."""
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
                    self.logger.info('ACT-Rental веб-сервис запущен')

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
                            f'ACT-Rental уже запущен и веб-интерфейс доступен '
                            f'(код {web_check.stdout})'
                        )
                        return True
                    else:
                        code_value = web_check.stdout if web_check else 'неизвестно'
                        self.logger.warning(
                            'ACT-Rental веб-сервис запущен, но '
                            'веб-интерфейс не отвечает '
                            f'(код {code_value})'
                        )
                        return False
                else:
                    self.logger.info('Контейнеры ACT-Rental существуют, но не запущены')
                    return False
            else:
                self.logger.info('Контейнеры ACT-Rental не созданы')
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
        """Start ACT-Rental containers."""
        self.logger.info('Запуск контейнеров ACT-Rental...')

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
                f.write(f'Контейнеры ACT-Rental запущены {timestamp}\n')
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
            volumes_cmd = 'docker volume ls --format "{{.Name}}" | grep act-rental'
            result = self.run_command(volumes_cmd)

            required_volumes = [
                'act-rental_postgres_data',
                'act-rental_redis_data',
                'act-rental_media',
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
        """Stop ACT-Rental containers without removing them."""
        self.logger.info('Остановка контейнеров ACT-Rental...')

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
        """Stop and remove ACT-Rental containers."""
        self.logger.info('Остановка и удаление контейнеров ACT-Rental...')

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
        """Restart ACT-Rental containers."""
        self.logger.info('Перезапуск контейнеров ACT-Rental...')

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
        """Open ACT-Rental in web browser."""
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

    def rebuild_containers(self) -> Tuple[bool, str]:
        """Rebuild ACT-Rental containers with fresh code."""
        self.logger.info('Пересборка контейнеров ACT-Rental...')

        if not self.is_docker_running():
            return False, 'Docker не запущен'

        docker_compose_cmd = self.get_docker_compose_cmd()

        # Stop containers
        self.logger.info('Stopping containers...')
        result_stop = self.run_command(f'{docker_compose_cmd} down')

        if not result_stop or result_stop.returncode != 0:
            error_msg = 'Ошибка при остановке контейнеров'
            self.logger.error(error_msg)
            return False, error_msg

        # Remove old images
        self.logger.info('Удаляем старые образы...')
        self.run_command('docker image prune -f')

        # Check for required build files and verify project path
        self.logger.info('Проверка файлов для сборки и пути проекта...')

        # Log the current working directory
        current_dir = os.getcwd()
        self.logger.info(f'Текущий рабочий каталог: {current_dir}')
        self.logger.info(f'Путь проекта в конфигурации: {self.project_path}')

        # Ensure absolute path
        if not os.path.isabs(self.project_path):
            abs_path = os.path.abspath(self.project_path)
            self.logger.info(f'Преобразование пути проекта в абсолютный: {abs_path}')
            self.project_path = abs_path

        # Create list of files to check
        files_to_check = ['Dockerfile', self.compose_file, 'app', 'requirements.txt']

        for file_name in files_to_check:
            file_path = os.path.join(self.project_path, file_name)
            if os.path.exists(file_path):
                self.logger.info(f'✓ Файл/каталог найден: {file_name}')
            else:
                self.logger.error(f'✗ Файл/каталог не найден: {file_name}')
                # Continue checking but log the issue

        dockerfile_path = os.path.join(self.project_path, 'Dockerfile')
        compose_path = os.path.join(self.project_path, self.compose_file)

        if not os.path.exists(dockerfile_path):
            error_msg = f'Dockerfile не найден в {self.project_path}'
            self.logger.error(error_msg)
            return False, error_msg

        if not os.path.exists(compose_path):
            error_msg = f'Файл {self.compose_file} не найден в {self.project_path}'
            self.logger.error(error_msg)
            return False, error_msg

        # Explicitly set working directory for build command
        self.logger.info(f'Используем каталог проекта для сборки: {self.project_path}')
        try:
            os.chdir(self.project_path)
            current_after_chdir = os.getcwd()
            self.logger.info(f'Текущий каталог после chdir: {current_after_chdir}')
        except Exception as e:
            error_msg = f'Ошибка при смене рабочего каталога: {str(e)}'
            self.logger.error(error_msg)
            return False, error_msg

        # Test docker and docker-compose availability
        self.logger.info('Проверка доступности docker...')
        docker_test = self.run_command('docker --version', capture_output=True)
        if docker_test and docker_test.returncode == 0:
            self.logger.info(f'Docker version: {docker_test.stdout.strip()}')
        else:
            error_msg = 'Docker не найден или не доступен'
            self.logger.error(error_msg)
            return False, error_msg

        # Rebuild images
        self.logger.info('Пересборка образов...')
        build_command = f'{docker_compose_cmd} build --no-cache'
        self.logger.info(f'Команда сборки: {build_command}')

        # Save the build command for debugging
        with open(os.path.join(self.log_folder, 'last_build_command.txt'), 'w') as f:
            f.write(f'Working directory: {current_after_chdir}\n')
            f.write(f'Command: {build_command}\n')
            f.write(f'Timestamp: {time.strftime("%Y-%m-%d %H:%M:%S")}\n')

        result_build = self.run_command(build_command)

        if not result_build or result_build.returncode != 0:
            stderr = (
                result_build.stderr
                if result_build and hasattr(result_build, 'stderr')
                else 'Неизвестная ошибка'
            )
            error_msg = f'Ошибка при пересборке образов: {stderr}'
            self.logger.error(error_msg)

            # If error output is too long, write it to a separate file
            if len(stderr) > 200:
                error_log_file = os.path.join(self.log_folder, 'build_error.log')
                try:
                    with open(error_log_file, 'w', encoding='utf-8') as f:
                        f.write(stderr)
                    self.logger.error(
                        f'Подробный лог ошибки записан в {error_log_file}'
                    )
                except Exception as e:
                    self.logger.error(f'Не удалось записать лог ошибки: {str(e)}')

            # Also check if we have any stdout
            if result_build and hasattr(result_build, 'stdout') and result_build.stdout:
                stdout_log_file = os.path.join(self.log_folder, 'build_stdout.log')
                try:
                    with open(stdout_log_file, 'w', encoding='utf-8') as f:
                        f.write(result_build.stdout)
                    self.logger.info(f'Вывод сборки записан в {stdout_log_file}')
                except Exception as e:
                    self.logger.error(f'Не удалось записать вывод сборки: {str(e)}')

            return False, (
                f'Ошибка при пересборке образов: {stderr[:200]}... '
                f'(смотрите полный лог в {self.log_folder})'
            )

        self.logger.info('Пересборка успешно завершена!')
        return True, (
            'Образы успешно пересобраны. '
            'Используйте кнопку "Запустить" для запуска контейнеров.'
        )

    @property
    def backup_manager(self):
        """Get backup manager instance (lazy loading).
        
        Returns:
            BackupManager instance
        """
        if self._backup_manager is None:
            try:
                from backup import BackupManager
                self._backup_manager = BackupManager(docker_manager=self)
                self.logger.info('BackupManager инициализирован')
            except ImportError as e:
                self.logger.error(f'Ошибка импорта BackupManager: {str(e)}')
                self._backup_manager = None
            except Exception as e:
                self.logger.error(f'Ошибка инициализации BackupManager: {str(e)}')
                self._backup_manager = None
        
        return self._backup_manager
