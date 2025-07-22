.PHONY: install install-dev install-test lint format clean run migrate pre-commit pre-commit-install

install:
	python -m venv .venv
	. .venv/bin/activate && \
	curl -LsSf https://astral.sh/uv/install.sh | sh && \
	uv pip install -e ".[dev]"

install-prod:
	python -m venv .venv
	. .venv/bin/activate && \
	curl -LsSf https://astral.sh/uv/install.sh | sh && \
	uv pip install -r requirements.txt

install-test:
	python -m venv .venv
	. .venv/bin/activate && \
	curl -LsSf https://astral.sh/uv/install.sh | sh && \
	uv pip install -e ".[test]"

test:
	docker compose -f docker-compose.test.yml build
	docker compose -f docker-compose.test.yml up -d test_db test-redis
	docker compose -f docker-compose.test.yml run --rm test python -m pytest -v --capture=no --cov=backend --cov-report=term-missing --cov-report=html tests/

lint:
	black --check --diff --skip-string-normalization backend tests
	isort --check --diff --profile black --line-length 88 --skip backend/models/__init__.py backend tests
	flake8 --config=.flake8 backend tests
	mypy --config-file=mypy.ini backend

format:
	black --skip-string-normalization backend tests
	isort --profile black --line-length 88 --skip backend/models/__init__.py backend tests

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

dev:
	docker compose build
	docker compose up -d

pre-commit-install:
	python3 -m pip install --user pre-commit
	pre-commit install

pre-commit:
	pre-commit run --all-files

pre-commit-check:
	pre-commit run
