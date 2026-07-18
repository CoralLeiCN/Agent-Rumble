SHELL := /bin/sh

.DEFAULT_GOAL := help

UV ?= uv
NPM ?= npm

.PHONY: help setup backend-setup frontend-setup dev backend frontend test \
	backend-test frontend-test typecheck build check

help: ## Show the available development commands.
	@printf '%s\n' \
		'Agent Rumble development commands' \
		'' \
		'  make setup          Install locked backend and frontend dependencies' \
		'  make dev            Start the backend and frontend development servers' \
		'  make backend        Start FastAPI at http://127.0.0.1:8000' \
		'  make frontend       Start Vite, normally at http://localhost:5173' \
		'  make test           Run backend and frontend tests' \
		'  make typecheck      Check frontend TypeScript types' \
		'  make build          Build the production frontend in frontend/dist' \
		'  make check          Run tests, type checking, and the production build'

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

typecheck: ## Check frontend TypeScript types.
	$(NPM) --prefix frontend run typecheck

build: ## Type-check and create the production frontend bundle.
	$(NPM) --prefix frontend run build

check: test build ## Run the full local verification suite.
