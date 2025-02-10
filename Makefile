.PHONY: install test lint format clean run migrate

install:
	pip install -r requirements.txt

test:
	pytest tests/ -v --cov=src.app

lint:
	flake8 src/app tests
	MYPYPATH=src mypy src/app tests
	black src/app tests --check
	isort src/app tests --check-only

format:
	black src/app tests
	isort src/app tests

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name "*.egg" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +


migrate:
	alembic upgrade head
