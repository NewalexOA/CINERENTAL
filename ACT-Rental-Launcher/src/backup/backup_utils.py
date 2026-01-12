"""Utility functions for backup system."""

import logging
import os
import subprocess
from typing import List, Tuple

# Setup logger for this module
logger = logging.getLogger(__name__)


def get_backup_base_directory() -> str:
    """Get the base directory for backups.

    Returns:
        Path to backup base directory
    """
    return os.path.expanduser('~/Documents/ACT-Rental-Backups')


def ensure_backup_directory_exists() -> str:
    """Ensure backup base directory exists.

    Returns:
        Path to backup base directory
    """
    backup_dir = get_backup_base_directory()
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir


def find_existing_backups() -> List[str]:
    """Find all existing backup directories.

    Returns:
        List of backup directory paths
    """
    backup_base = get_backup_base_directory()

    if not os.path.exists(backup_base):
        return []

    backup_dirs = []

    try:
        for item in os.listdir(backup_base):
            item_path = os.path.join(backup_base, item)
            if os.path.isdir(item_path):
                # Check if it looks like a backup directory (timestamp format)
                if is_valid_backup_directory_name(item):
                    backup_dirs.append(item_path)
    except Exception:
        pass

    # Sort by modification time (newest first)
    backup_dirs.sort(key=lambda x: os.path.getmtime(x), reverse=True)

    return backup_dirs


def is_valid_backup_directory_name(dirname: str) -> bool:
    """Check if directory name matches backup timestamp format.

    Args:
        dirname: Directory name to check

    Returns:
        True if matches backup directory naming pattern
    """
    import re

    # Matches format like: 20240726_182700
    pattern = r'^\d{8}_\d{6}$'
    return bool(re.match(pattern, dirname))


def get_backup_script_path() -> str:
    """Get path to create_backup.sh script.

    Returns:
        Path to backup script
    """
    # Script is located in project root scripts/ directory
    project_root = get_project_root()
    script_path = os.path.join(project_root, 'scripts', 'create_backup.sh')

    if os.path.exists(script_path):
        return script_path

    # Fallback: try relative to current location
    fallback_path = os.path.join(os.getcwd(), '..', '..', 'scripts', 'create_backup.sh')
    if os.path.exists(fallback_path):
        return os.path.abspath(fallback_path)

    raise FileNotFoundError('create_backup.sh script not found')


def get_project_root() -> str:
    """Get ACT-Rental project root directory.

    Returns:
        Path to project root
    """
    # Method 1: Start from current location and search up
    current = os.path.abspath(os.getcwd())

    # Check current and parent directories
    for _ in range(5):  # Limit search to 5 levels up
        if current == os.path.dirname(current):  # Reached filesystem root
            break

        # Check for docker-compose files (indicator of project root)
        if os.path.exists(
            os.path.join(current, 'docker-compose.yml')
        ) or os.path.exists(os.path.join(current, 'docker-compose.prod.yml')):
            return current

        current = os.path.dirname(current)

    # Method 2: Try relative paths from launcher location
    launcher_relative_paths = [
        '..',  # One level up from launcher
        '../..',  # Two levels up
        '.',  # Current directory
    ]

    for rel_path in launcher_relative_paths:
        abs_path = os.path.abspath(rel_path)
        if os.path.exists(
            os.path.join(abs_path, 'docker-compose.yml')
        ) or os.path.exists(os.path.join(abs_path, 'docker-compose.prod.yml')):
            return abs_path

    # Method 3: Last resort - try common patterns
    common_paths = [
        os.path.expanduser('~/Documents/GitHub/CINERENTAL'),
        os.path.expanduser('~/Github/CINERENTAL'),
        os.path.expanduser('~/github/CINERENTAL'),
        os.path.expanduser('~/Projects/CINERENTAL'),
    ]

    for path in common_paths:
        if os.path.exists(path) and (
            os.path.exists(os.path.join(path, 'docker-compose.yml'))
            or os.path.exists(os.path.join(path, 'docker-compose.prod.yml'))
        ):
            return path

    raise FileNotFoundError('ACT-Rental project root not found')


def run_backup_script() -> Tuple[bool, str, str]:
    """Execute the create_backup.sh script.

    Returns:
        Tuple of (success, stdout, stderr)
    """
    try:
        script_path = get_backup_script_path()
        project_root = get_project_root()

        # Make script executable
        os.chmod(script_path, 0o755)

        # Setup environment with Docker paths for macOS
        env = os.environ.copy()
        docker_paths = [
            '/usr/local/bin',  # Common Docker path
            '/opt/homebrew/bin',  # Homebrew Docker path on Apple Silicon
            '/Applications/Docker.app/Contents/Resources/bin',  # Docker Desktop path
        ]
        current_path = env.get('PATH', '')
        additional_paths = ':'.join(docker_paths)
        env['PATH'] = f'{additional_paths}:{current_path}'

        # Run script from project root directory
        process = subprocess.run(
            ['/bin/bash', script_path],
            cwd=project_root,
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,  # Prevent hanging on interactive input
            encoding='utf-8',  # Explicitly set UTF-8 encoding
            errors='replace',  # Replace invalid characters instead of failing
            timeout=1800,  # 30 minute timeout
            env=env,  # Pass enhanced environment
        )

        success = process.returncode == 0
        return success, process.stdout, process.stderr

    except subprocess.TimeoutExpired:
        return False, '', 'Backup script timed out after 30 minutes'
    except FileNotFoundError as e:
        return False, '', f'Backup script not found: {str(e)}'
    except Exception as e:
        return False, '', f'Error running backup script: {str(e)}'


def run_restore_script(backup_path: str) -> Tuple[bool, str, str]:
    """Execute restore script from backup directory.

    Args:
        backup_path: Path to backup directory containing restore script

    Returns:
        Tuple of (success, stdout, stderr)
    """
    logger.info(f'Running restore script from {backup_path}')
    try:
        restore_script = os.path.join(backup_path, 'restore_backup.sh')

        if not os.path.exists(restore_script):
            return False, '', 'Restore script not found in backup directory'

        # Make script executable
        os.chmod(restore_script, 0o755)

        # Setup environment with Docker paths for macOS
        env = os.environ.copy()
        docker_paths = [
            '/usr/local/bin',  # Common Docker path
            '/opt/homebrew/bin',  # Homebrew Docker path on Apple Silicon
            '/Applications/Docker.app/Contents/Resources/bin',  # Docker Desktop path
        ]
        current_path = env.get('PATH', '')
        additional_paths = ':'.join(docker_paths)
        env['PATH'] = f'{additional_paths}:{current_path}'

        # Run restore script with shorter timeout and better error handling
        try:
            logger.info(f'Executing restore script: {restore_script}')
            process = subprocess.run(
                ['/bin/bash', restore_script],
                cwd=backup_path,
                capture_output=True,
                text=True,
                input='yes\n',  # Automatically answer 'yes' to confirmation prompt
                encoding='utf-8',  # Explicitly set UTF-8 encoding
                errors='replace',  # Replace invalid characters instead of failing
                timeout=300,  # 5 minute timeout instead of 30 minutes
                env=env,  # Pass enhanced environment
            )

            success = process.returncode == 0
            logger.info(
                f'Restore script completed: success={success}, '
                f'returncode={process.returncode}'
            )
            logger.info(f'Restore script stdout: {process.stdout[:500]}...')
            if process.stderr:
                logger.warning(f'Restore script stderr: {process.stderr[:500]}...')
            return success, process.stdout, process.stderr

        except subprocess.TimeoutExpired as e:
            # Kill any hanging processes
            try:
                if hasattr(e, 'popen') and e.popen:
                    e.popen.kill()
                    e.popen.wait(timeout=5)
            except Exception:
                pass
            logger.error('Restore script timed out after 5 minutes')
            return (
                False,
                '',
                'Restore script timed out after 5 minutes. '
                'Check Docker and system status.',
            )
        except FileNotFoundError as e:
            return False, '', f'Restore script not found: {str(e)}'
        except Exception as e:
            return False, '', f'Error running restore script: {str(e)}'

    except Exception as e:
        return False, '', f'Error in restore script execution: {str(e)}'


def delete_backup_directory(backup_path: str) -> Tuple[bool, str]:
    """Safely delete a backup directory.

    Args:
        backup_path: Path to backup directory to delete

    Returns:
        Tuple of (success, error_message)
    """
    try:
        import shutil

        if not os.path.exists(backup_path):
            return False, 'Backup directory does not exist'

        if not os.path.isdir(backup_path):
            return False, 'Path is not a directory'

        # Safety check: ensure it's actually a backup directory
        if not is_backup_directory(backup_path):
            return False, 'Directory does not appear to be a backup'

        # Remove directory
        shutil.rmtree(backup_path)

        return True, ''

    except Exception as e:
        return False, f'Error deleting backup: {str(e)}'


def is_backup_directory(path: str) -> bool:
    """Check if path is a valid backup directory.

    Args:
        path: Path to check

    Returns:
        True if path appears to be a backup directory
    """
    if not os.path.isdir(path):
        return False

    # Check if it's in the backup base directory
    backup_base = get_backup_base_directory()
    try:
        if not os.path.commonpath([path, backup_base]) == backup_base:
            return False
    except ValueError:
        return False

    # Check if directory name matches backup pattern
    dirname = os.path.basename(path)
    if not is_valid_backup_directory_name(dirname):
        return False

    # Check for backup files
    required_files = ['backup_info.txt']
    for required_file in required_files:
        if not os.path.exists(os.path.join(path, required_file)):
            return False

    return True


def format_size(size_bytes: int) -> str:
    """Format size in bytes to human readable format.

    Args:
        size_bytes: Size in bytes

    Returns:
        Formatted size string
    """
    size = float(size_bytes)  # Use local variable to avoid modifying parameter
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f'{size:.1f} {unit}'
        size /= 1024.0
    return f'{size:.1f} PB'


def format_duration(seconds: int) -> str:
    """Format duration in seconds to human readable format.

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted duration string
    """
    if seconds < 60:
        return f'{seconds}с'
    elif seconds < 3600:
        minutes = seconds // 60
        secs = seconds % 60
        return f'{minutes}м {secs}с'
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f'{hours}ч {minutes}м'


def check_docker_available() -> bool:
    """Check if Docker is available and running.

    Returns:
        True if Docker is available
    """
    try:
        # Try multiple possible docker paths for macOS
        docker_paths = [
            '/usr/local/bin/docker',
            '/opt/homebrew/bin/docker',
            '/Applications/Docker.app/Contents/Resources/bin/docker',
            'docker',
        ]

        for docker_path in docker_paths:
            try:
                logger.debug(f'Trying Docker path: {docker_path}')
                result = subprocess.run(
                    [docker_path, 'info'],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    encoding='utf-8',
                    errors='replace',
                )
                if result.returncode == 0:
                    logger.info(f'Docker available at: {docker_path}')
                    return True
                else:
                    logger.debug(
                        f'Docker at {docker_path} returned code {result.returncode}'
                    )
            except FileNotFoundError:
                logger.debug(f'Docker not found at: {docker_path}')
                continue
            except subprocess.TimeoutExpired:
                logger.warning(f'Docker info command timed out for: {docker_path}')
                continue

        logger.warning('Docker not available at any known location')
        return False
    except Exception as e:
        logger.error(f'Error checking Docker availability: {e}')
        return False


def check_act_rental_running() -> bool:
    """Check if ACT-Rental containers are running.

    Returns:
        True if ACT-Rental is running
    """
    try:
        # Try to find project root
        project_root = get_project_root()
        logger.info(f'Checking ACT-Rental status from project root: {project_root}')

        # Setup environment with Docker paths for macOS
        env = os.environ.copy()
        docker_paths = [
            '/usr/local/bin',  # Common Docker path
            '/opt/homebrew/bin',  # Homebrew Docker path on Apple Silicon
            '/Applications/Docker.app/Contents/Resources/bin',  # Docker Desktop path
        ]
        current_path = env.get('PATH', '')
        additional_paths = ':'.join(docker_paths)
        env['PATH'] = f'{additional_paths}:{current_path}'

        # Method 1: Check for running containers with docker compose ps
        compose_commands = [
            # Modern docker compose (without hyphen)
            [
                'docker',
                'compose',
                '-f',
                'docker-compose.prod.yml',
                'ps',
                '--format',
                'json',
            ],
            ['docker', 'compose', '-f', 'docker-compose.yml', 'ps', '--format', 'json'],
            # Legacy docker-compose (with hyphen)
            [
                'docker-compose',
                '-f',
                'docker-compose.prod.yml',
                'ps',
                '--format',
                'json',
            ],
            ['docker-compose', '-f', 'docker-compose.yml', 'ps', '--format', 'json'],
            # Fallback: simple ps without json format
            ['docker', 'compose', '-f', 'docker-compose.prod.yml', 'ps'],
            ['docker', 'compose', '-f', 'docker-compose.yml', 'ps'],
            ['docker-compose', '-f', 'docker-compose.prod.yml', 'ps'],
            ['docker-compose', '-f', 'docker-compose.yml', 'ps'],
        ]

        for cmd in compose_commands:
            try:
                logger.debug(f'Trying command: {" ".join(cmd)}')
                result = subprocess.run(
                    cmd,
                    cwd=project_root,
                    capture_output=True,
                    text=True,
                    timeout=15,
                    encoding='utf-8',
                    errors='replace',
                    env=env,
                )

                logger.debug(
                    f'Command result: returncode={result.returncode}, '
                    f'stdout length={len(result.stdout)}'
                )

                if result.returncode == 0 and result.stdout.strip():
                    output = result.stdout.strip()

                    # Try to parse JSON format first
                    if '--format' in cmd and 'json' in cmd:
                        try:
                            import json

                            # Fix JSON format for multiple objects
                            fixed_output = output.replace('}\n{', '}, {')
                            containers = json.loads(f'[{fixed_output}]')
                            running_containers = [
                                c for c in containers if c.get('State') == 'running'
                            ]
                            web_running = any(
                                'web' in c.get('Service', '')
                                for c in running_containers
                            )
                            logger.info(
                                f'JSON format: found {len(running_containers)} '
                                f'running containers, web running: {web_running}'
                            )
                            if web_running:
                                return True
                        except (json.JSONDecodeError, ValueError) as e:
                            logger.debug(f'Failed to parse JSON: {e}')
                            continue
                    else:
                        # Parse simple text format
                        lines = output.split('\n')
                        running_lines = [
                            line
                            for line in lines
                            if 'running' in line.lower() or 'up' in line.lower()
                        ]
                        web_running = any('web' in line for line in running_lines)
                        logger.info(
                            f'Text format: found {len(running_lines)} '
                            f'running lines, web running: {web_running}'
                        )
                        if web_running:
                            return True

            except FileNotFoundError:
                logger.debug(f'Command not found: {cmd[0]}')
                continue
            except subprocess.TimeoutExpired:
                logger.warning(f'Command timed out: {" ".join(cmd)}')
                continue
            except Exception as e:
                logger.debug(f'Command failed: {e}')
                continue

        # Method 2: Direct docker ps check
        logger.info('Trying direct docker ps check')
        try:
            result = subprocess.run(
                ['docker', 'ps', '--format', 'table {{.Names}}\t{{.Status}}'],
                capture_output=True,
                text=True,
                timeout=10,
                encoding='utf-8',
                errors='replace',
                env=env,
            )

            if result.returncode == 0:
                output = result.stdout
                logger.debug(f'Docker ps output: {output[:200]}...')

                # Look for containers with project-related names
                running_containers = []
                for line in output.split('\n'):
                    if 'web' in line and (
                        'up' in line.lower() or 'running' in line.lower()
                    ):
                        running_containers.append(line)

                if running_containers:
                    logger.info(
                        f'Found running web containers via docker ps: '
                        f'{len(running_containers)}'
                    )
                    return True

        except Exception as e:
            logger.debug(f'Docker ps check failed: {e}')

        # Method 3: HTTP health check as last resort
        logger.info('Trying HTTP health check')
        try:
            import urllib.error
            import urllib.request

            # Try to connect to the web service
            for port in [8000, 80, 8080]:  # Common ports
                try:
                    with urllib.request.urlopen(
                        f'http://localhost:{port}/api/v1/health', timeout=5
                    ) as response:
                        if response.status == 200:
                            logger.info(f'ACT-Rental responding on port {port}')
                            return True
                except urllib.error.URLError:
                    continue

        except Exception as e:
            logger.debug(f'HTTP health check failed: {e}')

        logger.warning('ACT-Rental not detected as running by any method')
        return False

    except Exception as e:
        logger.error(f'Error checking ACT-Rental status: {e}')
        return False
