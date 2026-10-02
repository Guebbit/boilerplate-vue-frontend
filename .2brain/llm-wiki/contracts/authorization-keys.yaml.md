---
source: contracts/authorization-keys.yaml
sha256: 076ca9827751293b637b7d60d4737e7bd3aa90802f31b6e09e036546e3ab4235
generated_at: 2026-10-02T11:18:40.701506+00:00
model: ollama:qwen3.8:27b
---

# contracts/authorization-keys.yaml

## Purpose

Generated bundle that is the single authoritative list of every permission key in the system. It is produced by `npm run authorization:bundle`, which splices per-module fragments (`src/modules/<name>/authorization.yaml`) together with a root residual for app-level `core` keys. `--check` (wired into `complete`) fails the build if the bundle drifts from the fragments. The file is committed byte-identical in both the Node and PHP backend repos and is excluded from both formatters to prevent silent divergence.

## Key elements

- **`actions`** — The complete action vocabulary (CASL CRUD plus `checkout`, `sweep`, `override`, `start`, `receive`). This list is the one home of the vocabulary; `npm run gen:api` turns it into `api/permission-actions.ts` so no code re-types it.
- **`scopes`** — Two scopes: `tenant` (bare keys) and `platform` (keys prefixed `platform.`). A caller resolves to exactly one; they are never derived from a flag.
- **`keys`** — Array of permission entries. Each entry declares:
  - `key` — Shape is always `<family>.<breadth>.<action>`; breadth (`self` | `any`) is explicit, never omitted.
  - `module` / `subject` / `action` / `scope` / `description` — standard metadata.
  - `conditions` (optional) — ABAC filter fragment (e.g. `active: true`, `deletedAt: null`, `userId: $caller.id`) compiled into the read query rather than checked after it. `$caller.<field>` is the only placeholder; tenancy (`tenantId`) is injected by the resolver, never written here.
  - `stepUp` (optional) — `critical` or `sensitive`; declares that `requirePermission` must demand re-authentication within that window.
  - `deniedCode` (optional) — Specific 403 code for the error message (e.g. `EMAIL_NOT_VERIFIED`), resolved through translation.
- **No wildcards** — There is no `manage` action, no per-family or scope-wide wildcard. Every grant is an explicit key.

## Relationships

- **`api/permission-actions.ts`** — Generated artifact. `npm run gen:api` reads the `actions` list from this file and emits the TypeScript (and frontend) action-type definition. This file is the single source of truth for the vocabulary.
- **`docs/theory/authorization.md`** — Cited in inline comments as the explanatory reference for design decisions (e.g. why `cart.self.checkout` uses breadth `self`).
- **`inventory/routes.ts`** — Route handlers gate on keys like `inventory.any.sweep`; the `sweep` action exists in this file solely for that key.
- **`kernel/translation.ts`** — Resolves `deniedCode` values into localized 403 messages (`t('generic.error-<deniedCode, kebab-cased>')`).
- **`orders/domain/lifecycle.ts`** / **`orders/services/status.ts`** — Order status transitions are authorized via `orders.any.update`; the `override` action (and its dedicated key) exists to distinguish lifecycle-gate bypass from ordinary updates.

## Notes

- **Do not edit directly.** Introduce or change keys in the owning module's `src/modules/<name>/authorization.yaml`, then re-run `npm run authorization:bundle`. Direct edits will be overwritten and will trip the `--check` guard.
- **Breadth is mandatory.** A missing breadth segment is a bug, not a default. `products.self.read` and `products.any.read` are distinct grants with different condition sets.
- **Conditions are cross-storage vocabulary.** Field names (`active`, `userId`, `deletedAt`) describe the domain model, not either database schema. Each backend maps them onto its own columns when generating the query.
- **`deletedAt: null` appears only on `self` reads** (Product, Locale, Order). Wide (`any`) reads intentionally see soft-deleted rows. Payments have no such column and carry no such condition.
- **`write` is deliberately absent** from the action list. The model requires `create`/`update`/`delete` as separate grants because the operational permissions differ (e.g. update-a-user without delete-a-user).
- **Formatting exclusions.** Both `.prettierignore` and `dprint.json` exclude this file. Do not reformat it; the byte-identical commit across two repos is load-bearing.
