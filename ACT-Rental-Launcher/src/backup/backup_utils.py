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

    # Method 3: Fallback to known default location
    default_path = '/Users/actrental/Documents/GitHub/CINERENTAL'
    if os.path.exists(default_path):
        return default_path

    # Method 4: Last resort - try common patterns
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
        docker_paths = ['/usr/local/bin/docker', '/opt/homebrew/bin/docker', 'docker']

        for docker_path in docker_paths:
            try:
                result = subprocess.run(
                    [docker_path, 'info'], capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    return True
            except FileNotFoundError:
                continue

        return False
    except Exception:
        return False


def check_act_rental_running() -> bool:
    """Check if ACT-Rental containers are running.

    Returns:
        True if ACT-Rental is running
    """
    try:
        # Try to find project root
        project_root = get_project_root()

        # Try multiple docker-compose commands
        compose_commands = [
            [
                'docker',
                'compose',
                '-f',
                'docker-compose.prod.yml',
                'ps',
                '--services',
                '--filter',
                'status=running',
            ],
            [
                'docker-compose',
                '-f',
                'docker-compose.prod.yml',
                'ps',
                '--services',
                '--filter',
                'status=running',
            ],
        ]

        for cmd in compose_commands:
            try:
                result = subprocess.run(
                    cmd, cwd=project_root, capture_output=True, text=True, timeout=10
                )

                if result.returncode == 0:
                    running_services = (
                        result.stdout.strip().split('\n')
                        if result.stdout.strip()
                        else []
                    )
                    # Check if web service is running (main indicator)
                    return 'web' in running_services
            except FileNotFoundError:
                continue

        return False

    except Exception:
        return False
