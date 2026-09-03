# Repository Overview

## What This Is

A **modular e-commerce platform** with a full front-to-back stack. The codebase is organized around a **Domain-Driven Design (DDD)** architecture with explicit layers, module lifecycles, and API contracts (both REST and AsyncAPI/event-driven).

## Main Areas & How They Relate

| Area | Purpose |
|---|---|
| **Domain Modules** (`src/modules/`) | Core business capabilities: `products`, `cart`, `cart-checkout`, `orders`, `payments`, `inventory`, `delivery`, `wishlist`, `account`, `users`, `admin`, `feedback`, `locales` / `locales-overrides`, `realtime`, `demo`. Each is a self-contained unit with its own lifecycle. |
| **Application / UI** (`src/app/`, `src/ui/`) | Composes modules into pages, handles state and routing, rendering. |
| **Infrastructure** (`src/infrastructure/`) | Cross-cutting utilities (e.g., a shared `logger.ts` wired into ~35 files), transport, persistence. |
| **Contracts** (`contracts/rest/`) | Zod schema definitions and route types for the REST API; `asyncapi.yaml` defines the event/async side. |
| **Docs & Tooling** (`docs/`, `cypress.config.ts`, `docker-compose*.yml`) | VitePress-powered documentation site, E2E test config, local & production Docker orchestration. |

The **theory** docs (`docs/theory/`) describe the layering, module boundaries, strategic DDD context mapping, and request flow. The **reference** docs (`docs/reference/`) map the physical source layout (`src-app`, `src-modules`, `src-infrastructure`, `src-ui`, `tests`).

## Where to Start Reading

1. **`docs/getting-started.md`** – setup and first run.
2. **`docs/theory/architecture.md`** + **`docs/theory/layers.md`** – the mental model for how the codebase is structured.
3. **`docs/theory/modules.md`** + **`docs/theory/module-lifecycle.md`** – how individual domain modules are built and wired.
4. **`docs/api/index.md`** – the public surface (REST + async).
5. **`docs/modules/index.md`** – catalogue of domain modules and their responsibilities.
6. **`README.md`** – top-level quickstart and project context.

> **Tip for AI readers:** follow `docs/theory/reading-path.md` for the intended progressive disclosure order; consult `docs/reference/src-modules.md` when you need to map a concept to a concrete source directory.
