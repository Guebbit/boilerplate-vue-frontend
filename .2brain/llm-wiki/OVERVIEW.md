---
generated_at: 2026-10-17T02:49:24.391119+00:00
model: ollama:qwen3.8:27b
---

# Repository Overview

## What This Is

**Guebbit** is a Vue.js web application that includes e-commerce functionality (cart, payments via webhooks) and user account management (including two-factor authentication). It pairs a frontend with a well-defined API contract layer expressed in both **OpenAPI** (REST) and **AsyncAPI** (event-driven) specifications, from which TypeScript types and client code are generated.

## Main Areas

| Area | Location | Role |
|---|---|---|
| **App source** | `src/` | Vue components, stores, and infrastructure (HTTP client, logger, etc.) |
| **Modules** | `src/modules/` | Feature-scoped code (e.g. `account/`, `cart/`) with views, stores, and logic |
| **Contracts** | `contracts/`, `openapi.yaml`, `asyncapi.yaml` | API specs, REST route tables, Zod schemas, permission actions, error codes, authorization keys |
| **Codegen scripts** | `scripts/contracts/` | Generate TS types, route tables, operation modules, permission actions, and error codes from the specs |
| **Client generation** | `orval.config.ts` | Produces typed HTTP clients from `openapi.yaml` |
| **Tests** | `tests/` | Unit and E2E (Cypress) suites, with shared support/fixture/stub helpers |
| **E2E tooling** | `scripts/e2e/` | Live-shard runs, payment-webhook mocks, device-session helpers, flaky-report collection |
| **Demo tooling** | `scripts/demo/` | Scripts for running a stripped-down backend, measuring build size, and module surgery |
| **Docs site** | `docs/` | VitePress-powered documentation |
| **Infrastructure** | `docker/`, `docker-compose*.yml`, `docker/Dockerfile.production` | Container builds, entrypoint config generation (runtime config, `security.txt`) |
| **Release / CI** | `release-please-config.json`, `eslint.config.ts`, `cypress.config.ts` | Conventional-commits release automation, lint, E2E runner config |

## How They Relate

```
openapi.yaml / asyncapi.yaml
        │
        ├──► scripts/contracts/generate-*  ──►  contracts/*.ts (types, routes, permissions)
        │
        ├──► orval  ──►  src/infrastructure/http/  (typed client)
        │
        └──►  src/modules/*  (Vue features consume the client & types)

tests/  ──►  exercises  src/  and  contracts/  (unit + Cypress E2E)
docker/ ──►  packages  src/  +  generated contracts  into a production image
```

## Where to Start Reading

1. **`README.md`** – project purpose, quick-start, and links.
2. **`CLAUDE.md`** – conventions and guidance written for AI/human collaborators.
3. **`src/`** entry point → `src/infrastructure/http/index.ts` (HTTP layer) and the modules under `src/modules/` to see the app's features.
4. **`openapi.yaml`** and **`asyncapi.yaml`** – the source-of-truth API surface.
5. **`contracts/rest/routes.ts`** – generated route table for a quick map of REST endpoints.
6. **`docker-compose.yml`** – how to run the full stack locally.
7. **`INSTALL.md`** – local development setup steps.
