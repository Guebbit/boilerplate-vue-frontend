# tests/support/e2e/admin-api-task.ts

## Purpose

Provides the `adminApi` Cypress task: an authenticated admin-API call executed in Node (outside the browser) so that the page's own refresh cookie and session state remain untouched. It exists so test fixtures can provision or modify backend resources directly, without coupling to the browser's authentication lifecycle.

## Key elements

- **`AdminApiRequest`** – Input interface: `apiUrl`, `path`, `method`, `email`, `password`, and optional `body`.
- **`unwrap<T>`** *(internal)* – Parses the shared `{ success, data, message }` envelope both paired backends return; throws on non-OK status; resolves with `data`.
- **`login`** *(internal)* – POSTs to `${apiUrl}/account/login` and extracts the Bearer `token`.
- **`adminApi<T>`** *(exported)* – The task entry point. Logs in, then issues the caller-specified request with a `Bearer` header. Resolves with `data ?? null`.

## Relationships

- **`cypress.config.ts`** – Registers `adminApi` as a Cypress `task` so tests invoke it via `cy.task('adminApi', …)`. This file is the task implementation.

## Notes

- The token is fetched on **every** call, never cached. `cy.resetState()` drops and reseeds the in-memory database between tests, invalidating any prior token; the cost of a stale-token retry path outweighs the saved round-trip.
- The final `.then((data) => data ?? null)` is deliberate: a body-less response (e.g. `DELETE`) yields `undefined` from `unwrap`, which would make Cypress reject the task as non-serialisable. Coercing to `null` avoids that.
- The file intentionally runs **outside** the browser for the same reason its sibling `createSession` task does: a plain `fetch` carries no cookie jar, so the page's session/refresh-cookie state is never disturbed.
