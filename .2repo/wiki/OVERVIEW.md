# Repository Overview

## What this repository is

A TypeScript-based **e-commerce / online-store application** built around a modular, Domain-Driven Design (DDD) architecture. It covers the full commerce domain—products, inventory, cart & checkout, orders, payments, delivery, users & accounts, wishlist, and an admin surface—with real-time eventing (AsyncAPI) alongside a REST API (Zod-validated contracts).

## Main areas and how they relate

| Area | Key evidence | Role |
|---|---|---|
| **Domain modules** (`src/modules/*`) | docs/modules/*, `docs/theory/modules.md`, `module-lifecycle.md` | Each business capability (cart, orders, payments, inventory, …) is an isolated module with its own lifecycle. |
| **Application layer** (`src/app/*`) | `docs/reference/src-app.md` | Orchestrates use-cases across modules; entry point for HTTP and event handlers. |
| **Infrastructure** (`src/infrastructure/*`) | `src/infrastructure/http/index.ts`, `src/infrastructure/utils/logger.ts` | Cross-cutting concerns: HTTP server, logging (touches 36 files), persistence, messaging. |
| **UI** (`src/ui/*`) | `docs/reference/src-ui.md`, component-testing docs | Front-end components; served behind the API. |
| **Contracts** (`contracts/rest/*`) | `schemas.zod.ts`, `asyncapi.yaml` | Typed request/response schemas and event specifications that modules and consumers share. |
| **Admin dashboard** | `docs/modules/admin-dashboard.md`, `docs/tools/admin-dashboard.md` | Internal ops surface for managing the store. |
| **Testing** (`tests/*`) | Cypress config, `a11y-sweep.ts`, `visual-sweep.ts`, component-testing docs | E2E (Cypress), component, and accessibility test suites. |
| **Ops & tooling** | `docker-compose.yml`, `docker-compose.production.yml`, `docs/reference/ops.md`, scripts | Local dev (Docker Compose), production compose, and build/test scripts. |
| **Docs site** | VitePress config, `docs/*` | A living wiki (this document) covering theory, API, modules, and reference. |

**Request flow** (per `docs/theory/request-flow.md`): HTTP or event → application layer → domain module → infrastructure. Modules communicate through contracts and the async event bus rather than direct imports.

## Where to start reading

1. **`docs/theory/reading-path.md`** – the project's own suggested reading order.
2. **`docs/getting-started.md`** – how to run the stack locally (Docker Compose, scripts).
3. **`docs/theory/architecture.md`** + **`docs/theory/strategic-ddd.md`** – why the code is shaped the way it is.
4. **`contracts/rest/schemas.zod.ts`** – the concrete API surface.
5. **`docs/modules/index.md`** – pick a single domain module (e.g. *cart-checkout*) to trace one end-to-end flow.
6. **`tests/`** – see expected behaviour in executable form.
