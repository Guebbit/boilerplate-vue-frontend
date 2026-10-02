---
generated_at: 2026-10-02T19:21:43.638356+00:00
model: ollama:qwen3.8:27b
---

# Repository Overview

## What This Is

A **Vue.js web application** branded as **Guebbit**. The repo contains the frontend SPA, its API contracts (REST + async messaging), build tooling, Docker packaging, a VitePress documentation site, and an extensive test suite (unit + Cypress E2E). Evidence points to features including account management (two-factor challenge), device sessions, payment webhooks, email messaging, and anti-bot checks.

## Main Areas and How They Relate

| Area | Key locations | Role |
|---|---|---|
| **Application frontend** | `src/modules/` (e.g. `account/`), `index.html` | Vue components & view logic, organised per feature module |
| **API contracts (source of truth)** | `openapi.yaml`, `asyncapi.yaml`, `contracts/authorization-keys.yaml` | Define REST routes, async events, permissions, and error codes |
| **Generated contracts** | `contracts/rest/*.ts`, `contracts/asyncapi.generated.ts` | TypeScript types/schemas (Zod) generated from the YAML specs via `orval` and `scripts/contracts/` |
| **Infrastructure** | `src/infrastructure/http/`, `src/infrastructure/utils/` | HTTP client wiring, logging, shared utilities consumed across modules |
| **Build & packaging** | `docker/`, `docker-compose*.yml`, `orval.config.ts`, `eslint.config.ts` | Dockerfile, entrypoint scripts (runtime-config & security.txt generation), lint, codegen |
| **Testing** | `tests/unit/`, `tests/support/`, `cypress.config.ts` | Vue component unit tests; Cypress E2E with shared harness, steps, and stubs |
| **Docs** | `docs/.vitepress/`, `SECURITY.md` | VitePress-based site for internal/external documentation |
| **Automation scripts** | `scripts/contracts/`, `scripts/e2e/`, `scripts/docs/`, `scripts/demo/` | Contract generation/validation, E2E helpers (payment webhook, device session, mail), docs consistency checks |

**Data flow at a glance:**
`openapi.yaml` / `asyncapi.yaml` → codegen (`orval`, `scripts/contracts/*`) → `contracts/*.ts` → consumed by `src/infrastructure/http/` and `src/modules/*` → tested by `tests/` → packaged via `docker/`.

## Where to Start Reading

1. **`README.md`** – project intent, setup commands, and high-level structure.
2. **`CLAUDE.md`** – context notes aimed at AI assistants; useful for quick orientation.
3. **`openapi.yaml`** – the full REST surface; read alongside `contracts/rest/routes.ts` for the generated view.
4. **`src/infrastructure/http/index.ts`** – how the app talks to the API (most-connected infra file).
5. **`src/modules/account/views/TwoFactorChallenge.vue`** – a representative feature module to see the component pattern.
6. **`tests/support/e2e/steps.ts`** and **`tests/support/unit/wire-modules.ts`** – understand the test harness before writing or debugging tests.
7. **`docker/Dockerfile.production`** + entrypoint scripts – how the app is built and booted in production.

> **Tip:** The dependency graph shows `wire-modules.ts` (87 connections) and `logger.ts` (62) as the most central nodes. If a change ripples unexpectedly, check those files first.
