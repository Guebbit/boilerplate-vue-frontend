---
generated_at: 2026-11-10T08:34:26.334544+00:00
model: ollama:qwen3.8:27b
---

# Repository Overview

## What This Is

A full-stack web application with e-commerce capabilities (evidenced by a `cart` domain module), a REST API, and async messaging. The project ships as a Dockerized service with a VitePress documentation site, a privacy-friendly analytics integration (Umami), and a layered test suite (unit, E2E via Cypress, mutation testing).

## Main Areas

| Area | Path | Role |
|---|---|---|
| **Domain modules** | `src/modules/` | Bounded contexts (e.g. `cart`). Each module owns its own domain logic. |
| **Infrastructure** | `src/infrastructure/` | Cross-cutting concerns: HTTP client/server, structured logging, utilities. Heavily imported (logger connects to ~89 files). |
| **API contracts** | `contracts/` | Single source of truth for both REST (`openapi.yaml` → `orval` → generated TS, Zod schemas) and Async (`asyncapi.yaml` → generated TS). Also defines authorization keys, cookies, permission vocabulary, and error codes. |
| **Frontend / static shell** | `index.html`, `public/` | Entry point for the web UI. |
| **Testing** | `tests/` | Shared E2E harness & step definitions (Cypress), unit fixtures, wire-module stubs, and mounted-VM helpers. |
| **Audit & quality scripts** | `scripts/audit/` | Custom tooling for accessibility, code-shape, CSS-invasiveness, and design-manual conformance checks. |
| **Docs** | `docs/` | VitePress site covering getting-started, design-system theory, and developer tooling (Docker/Podman, environment, observability, touch-testing, visual-regression). |
| **Ops & CI** | `docker/`, `docker-compose*.yml`, `release-please-config.json`, `knip.config.ts`, `mutation-baseline.json` | Container builds (dev, prod, docs), entrypoint hooks for runtime config / security-txt / robots.txt, automated releases, dependency auditing, mutation baseline. |
| **Top-level config** | `package.json`, `eslint.config.ts`, `cypress.config.ts`, `orval.config.ts`, `CLAUDE.md`, `SECURITY.md`, `INSTALL.md` | Build/lint/test tooling and contributor/AI-agent guidance. |

## How the Pieces Relate

```
openapi.yaml / asyncapi.yaml
        │
        ▼  (orval, generated)
   contracts/  ──►  src/modules/*  (domain logic)
        │                    │
        ▼                    ▼
   REST / Async     src/infrastructure/  (HTTP, logging)
   API surface         │
                       ▼
                index.html  (UI shell)
                       │
                       ▼
        docker/ + docker-compose*  (deployment)
                       │
                       ▼
        docs/ (VitePress) + scripts/audit/ (quality gates)
```

Contracts are the seam between frontend and backend; domain modules consume them; infrastructure provides the I/O; Docker packages the whole for deployment; audit scripts and the test suite enforce quality.

## Where to Start Reading

1. **`README.md` → `INSTALL.md`** – what the project is, how to run it locally.
2. **`contracts/rest/routes.ts` + `contracts/asyncapi.generated.ts`** – the API surface in plain TypeScript.
3. **`src/modules/cart/domain/index.ts`** – a concrete domain module (highest fan-in among modules) to see how business logic is structured.
4. **`src/infrastructure/http/index.ts`** – how HTTP calls are made/received.
5. **`docs/getting-started.md`** – developer walkthrough.
6. **`CLAUDE.md`** – conventions and guardrails for AI-assisted work in this repo.
7. **`docker/docker-entrypoint.d/`** – how the container bootstraps runtime config at start.
