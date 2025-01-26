"""Setup script for the cinerental package."""

from setuptools import find_packages, setup

setup(
    name='cinerental',
    version='0.1.0',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'alembic',
        'psycopg2-binary',
        'redis',
        'python-jose[cryptography]',
        'passlib[bcrypt]',
        'python-multipart',
        'aiofiles',
    ],
    extras_require={
        'dev': [
            'pytest',
            'pytest-asyncio',
            'pytest-cov',
            'black',
            'isort',
            'mypy',
            'pre-commit',
        ],
    },
)
