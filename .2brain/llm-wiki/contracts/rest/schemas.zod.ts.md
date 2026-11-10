---
source: contracts/rest/schemas.zod.ts
sha256: 41af9ecdfc729edcdd751be76adf23a5884eb328f22a8721f668bf411a0e0a72
signature: 0e2622b4c0d3f52cd748d99edabd91a5a4b2d7ea6414b48fdcc5117c59be7be1
generated_at: 2026-11-10T02:13:04.152208+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/schemas.zod.ts

## Purpose

Generated (orval v8.20.0) Zod schemas that model the response payloads of the Boilerplate API's REST endpoints. The file exists to give TypeScript clients, test suites, and SDK consumers a single, codegen-oriented source of truth for response shapes without re-deriving them from the OpenAPI spec at build time.

## Key elements

- **`GetHealthResponse`** – Schema for `GET /health` (public client-facing ping; `status: 'ok'`).
- **`GetConfigResponse`** – Schema for `GET /config` (boot-time public config: session mode/lifetimes, OAuth providers, anti-bot settings, operator legal identity, terms version). Accompanied by regex/length constants (`getConfigResponseOperatorCountryOneMax`, `getConfigResponseOperatorCountryOneRegExp`, `getConfigResponseOperatorEmailOneMax`).
- **`GetLivezResponse`** / **`GetReadyzResponse`** – `zod.unknown()` schemas for the liveness (`/livez`) and readiness (`/readyz`) probes; both are empty-body 2xx/503 endpoints.
- **`GetSecurityTxtResponse`** – `zod.string()` for the RFC 9116 `security.txt` plain-text response.
- **`ListLocalesResponse`** – Schema for `GET /locales`; describes per-locale metadata (tag, direction, active flag, apps, source, entry/revision counts, admin `actions`) plus the deployment-level `default` and `fallback` tags. Backed by a block of exported regex/length constants (`listLocalesResponseLocalesItemTagMax`, `listLocalesResponseLocalesItemTagRegExp`, `listLocalesResponseLocalesItemAppsItemRegExp`, etc.).
- **Regex & length constants** – Every non-trivial string constraint is extracted into a named `export const` (e.g. `listLocalesResponseLocalesItemIdRegExp`) so consumers can reference the pattern independently of the schema object.

## Relationships

- **`src/modules/inventory/tests/e2e/actions.cy.ts`**, **`src/modules/orders/tests/e2e/actions.cy.ts`**, **`src/modules/payments/tests/e2e/actions.cy.ts`**, **`src/modules/stats/tests/e2e/actions.cy.ts`**, **`src/modules/stock-alerts/tests/e2e/actions.cy.ts`**, **`src/modules/tasks/tests/e2e/actions.cy.ts`** – Import these schemas to type-check or validate API responses captured during Cypress end-to-end runs, keeping test assertions aligned with the generated contract.
- **`src/modules/shop-tasks/tests/summary-fixtures.ts`** – Supplies fixture data shaped to satisfy the relevant response schema so that shop-task tests exercise realistic payloads.

## Notes

- **Do not edit manually.** The header banner and orval version stamp indicate this file is regenerated; local changes will be overwritten on the next codegen run.
- **Regex constants are part of the public surface.** Downstream code (tests, validators) imports the `RegExp` and `Max` constants directly, not by digging into the schema tree. Renaming them in the spec would be a breaking change for those consumers.
- **`zod.unknown()` for probes is intentional.** `/livez` and `/readyz` have no body; the schema exists only so the generated client has a typed return slot rather than `void`.
- **The file is truncated in the current snapshot.** The OpenAPI spec it was generated from covers additional endpoints (products, users, orders, etc.) whose schemas are not visible here. Treat the exports listed above as a partial inventory.
