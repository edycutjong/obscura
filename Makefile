.PHONY: help install dev build test e2e lighthouse security-scan ci

help:
	@echo "Obscura Development Harness"
	@echo "──────────────────────────────────────────────"
	@echo "make install       Install dependencies"
	@echo "make dev           Start local dev server"
	@echo "make build         Verify production build"
	@echo "make test          Run 100+ unit/integration tests"
	@echo "make e2e           Run Playwright E2E tests"
	@echo "make lighthouse    Run Lighthouse CI performance audit"
	@echo "make security-scan Run npm audit & license check"
	@echo "make ci            Run all CI checks (lint, typecheck, coverage, contracts, circuits)"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

e2e:
	@echo "🎭 Running Playwright E2E tests (demo mode)..."
	npx playwright test

lighthouse:
	@echo "🔦 Running Lighthouse CI audit..."
	npx lhci autorun

security-scan:
	@echo "=== NPM AUDIT ==="
	npm audit --audit-level=high || true
	@echo ""
	@echo "=== LICENSE CHECK ==="
	npx license-checker --production --failOn "GPL-3.0;AGPL-3.0" --summary || true

ci:
	@echo "🧹 Running code quality and audit checks..."
	npm run ci
	@echo "🦀 Running Rust contract unit tests..."
	cd contract && cargo test
	@echo "🧩 Running Noir settlement circuit unit tests..."
	cd circuit && nargo test
	@echo "🧩 Running Noir netting circuit unit tests..."
	cd circuit_netting && nargo test
	@echo "🧩 Running Noir multinet circuit unit tests..."
	cd circuit_multinet && nargo test
	@echo "✅ All CI checks passed!"
