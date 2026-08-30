# docs/api/endpoints.md

## Purpose

Canonical reference for every HTTP endpoint the backend exposes, grouped by domain. It exists so the frontend team (and the generated client in `contracts/rest/index.ts`) knows the method, path, minimum auth level, and purpose of each route without reading backend source. Backend-internal details (Redis, RabbitMQ, PDF rendering) are deliberately excluded.

## Key elements

- **Endpoint groups (sections):** System, Observability, Account & Auth, Products, Cart, Orders, Users (admin), Feedback — each a Markdown table of `Method | Endpoint | Auth | Description`.
- **SSE contract:** Defines the three server→client events (`observability.metrics.snapshot`, `observability.metrics.updated`, `observability.heartbeat`) and the connection URL (`/observability/events` or `VITE_API_SSE`).
- **Auth column vocabulary:** `none`, `user`, `admin` — the minimum access level the backend enforces per route.
- **Cross-links:** Points to `docs/api/observability.md` (response shapes + composable), `docs/tools/security.md` (JWT handling), `docs/tools/realtime.md` (full SSE event contract), and the API workflow page.

## Relationships

- **`docs/api/observability.md`** — This file's Observability section is a stub that delegates to that page for response shapes and the fetching composable.
- **`docs/api/asyncapi-workflow.md`** — Linked from the "Related pages" section as the workflow doc describing how the OpenAPI spec and the generated client stay in sync; this file is the *output* that workflow documents.
- **`github/workflows/ci.yml`** — CI likely validates that the generated client (`contracts/rest/index.ts`) matches the endpoints documented here, or runs contract tests against the listed routes.
- **`CHANGELOG.md`** — Endpoint additions/removals/renames are expected to be logged there; this file is the "current state" reference the changelog diffs against.

## Notes

- The **Auth** column is the *minimum* level required, not the only level accepted (e.g., `admin` routes also accept `user` if the token grants admin).
- Cart and Orders are scoped per-user: a `user` token only sees their own data; `admin` gets cross-user write access.
- The SSE stream is **server→client only**; there is no client→server channel on that socket.
- `VITE_API_SSE` env var can override the SSE base URL at build time — the path `/observability/events` is the default, not the only option.
- Bulk mutations use the collection path with `PUT`/`DELETE` (no `:id`), while single-item mutations use `:id`. Don't confuse the two when writing tests.
