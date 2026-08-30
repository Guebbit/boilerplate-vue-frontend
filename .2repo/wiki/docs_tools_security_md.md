# docs/tools/security.md

## Purpose

Frontend-facing security reference. Documents how the SPA handles auth tokens, enforces route access, and handles HTTP auth errors—so developers (human or AI) can locate the security model without reading every guard or interceptor file. It explicitly scopes to the **frontend perspective** and links out to the backend repo for JWT/bcrypt details.

## Key elements

- **Auth token model** — split access (in-memory) / refresh (HttpOnly cookie) description.
- **Login → auth → refresh flow** — Mermaid diagram of the full 401-recovery cycle.
- **Where token logic lives** — table mapping each security concern (storage, Bearer attachment, 401 handling, restore, guards) to its source file.
- **Route guards** — the single `meta.access` predicate (`auth` | `admin` | `guest` | absent), how `enforceRouteAccess`/`canAccess` work in `router.beforeEach`, and the `?continue=` redirect convention.
- **Interceptor error handling** — 401 / 403 / 5xx response behavior and Grafana Faro capture.
- **Security properties provided** — Bearer transport, HttpOnly cookie, `sameSite=lax`, no-PII analytics rule.
- **External references & related pages** — OWASP cheat-sheet links and links to `sitemap.md`, `request-flow.md`, `state-and-routing.md`.

## Relationships

- **`src/infrastructure/stores/session.ts`** — the page documents this store's role (holds the access token and a `{id, email, admin}` projection; nothing persisted to `localStorage`).
- **`src/modules/account/stores/profile.ts`** — documented as the visitor's own account-record store, distinct from the session projection.
- **`src/infrastructure/http/index.ts`** — the page describes this file's request interceptor (attaches `Authorization: Bearer`) and response interceptor (handles 401/403/5xx).
- **`src/app/guards/authentications.ts`** — the page documents `tryRestoreAuth`, `canAccess`, and `enforceRouteAccess` exported from this file, and their ordering in `router.beforeEach`.
- **`docs/index.md`** — this page is linked from the docs index as the security entry point.
- **`docs/api/asyncapi-workflow.md`** — the backend auth endpoints referenced here (login, refresh) are specified in the AsyncAPI workflow doc.

## Notes

- This is a **docs-only** file; it exports no code. It is the canonical place to look before touching any auth-related source file.
- The page deliberately does **not** duplicate backend internals (JWT signing, bcrypt, refresh-token DB)—those live in the external `boilerplate-node-backend` repo.
- The single-predicate guard design (`meta.access` → `canAccess`) means there are no separate `isAuth`/`isAdmin`/`isGuest` guards; `AppNavigation` reuses the same predicate so visible links never dead-end.
- `tryRestoreAuth` runs **before** `enforceRouteAccess` in the same `beforeEach` hook—order matters for post-reload admin-control visibility.
