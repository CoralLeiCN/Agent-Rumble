SHELL := /bin/sh

.DEFAULT_GOAL := help

UV ?= uv
NPM ?= npm
CARD_VALIDATOR := plugins/agent-project-card/skills/agent-project-card/scripts/validate_project_card.py

.PHONY: help setup backend-setup frontend-setup dev backend frontend test \
	backend-test frontend-test typecheck build check lint format format-check cards-check audit

help: ## Show the available development commands.
	@printf '%s\n' \
		'Agent Rumble development commands' \
		'' \
		'  make setup          Install locked backend and frontend dependencies' \
		'  make dev            Start the backend and frontend development servers' \
		'  make backend        Start FastAPI at http://127.0.0.1:8000' \
		'  make frontend       Start Vite, normally at http://localhost:5173' \
		'  make test           Run backend and frontend tests' \
		'  make typecheck      Check backend Python and frontend TypeScript types' \
		'  make lint           Lint Python and frontend code' \
		'  make format         Format Python and frontend code' \
		'  make cards-check    Validate every committed canonical card' \
		'  make audit          Check Python and npm dependency advisories' \
		'  make build          Build the production frontend in frontend/dist' \
		'  make check          Run lint, formatting, types, cards, tests, and build'

setup: backend-setup frontend-setup ## Install all locked dependencies.

backend-setup: ## Synchronize the locked Python workspace.
	$(UV) sync --locked

frontend-setup: ## Install the locked frontend dependencies.
	$(NPM) --prefix frontend ci

dev: ## Start both development servers. Use Ctrl+C to stop them.
	$(MAKE) --no-print-directory -j2 backend frontend

backend: ## Start the FastAPI development server.
	$(UV) run --locked fastapi dev backend/src/agent_project_intelligence/main.py

frontend: ## Start the Vite development server.
	$(NPM) --prefix frontend run dev

test: backend-test frontend-test ## Run all automated tests.

backend-test: ## Run backend tests.
	$(UV) run --locked pytest backend/tests

frontend-test: ## Run frontend tests once.
	$(NPM) --prefix frontend test

typecheck: ## Check backend and frontend types.
	$(UV) run --locked mypy
	$(NPM) --prefix frontend run typecheck

lint: ## Lint all Python and frontend code.
	$(UV) run --locked ruff check .
	$(NPM) --prefix frontend run lint

format: ## Apply the project formatters.
	$(UV) run --locked ruff format .
	$(NPM) --prefix frontend run format

format-check: ## Check formatting without modifying files.
	$(UV) run --locked ruff format --check .
	$(NPM) --prefix frontend run format:check

cards-check: ## Validate published and analysis-library canonical cards.
	@for card in project-cards/*/project-card.yaml catalog/cards/*/versions/*/project-card.yaml; do \
		$(UV) run --locked python $(CARD_VALIDATOR) "$$card" || exit $$?; \
	done

audit: ## Query dependency vulnerability databases (requires network access).
	@requirements_file=$$(mktemp); \
		trap 'rm -f "$$requirements_file"' EXIT; \
		$(UV) export --locked --all-packages --no-emit-workspace --output-file "$$requirements_file" >/dev/null && \
		$(UV) run --locked pip-audit --disable-pip --require-hashes --strict --requirement "$$requirements_file"
	$(NPM) --prefix frontend audit --audit-level=moderate

build: ## Type-check and create the production frontend bundle.
	$(NPM) --prefix frontend run build

check: lint format-check typecheck cards-check test build ## Run the full local verification suite.
