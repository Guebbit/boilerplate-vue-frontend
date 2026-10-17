---
source: src/modules/api-keys/tests/routes.spec.ts
sha256: 9d1722f27bf49f1f71e6251dfceda39f50181f746b258a4c5d89b0f61675a369
generated_at: 2026-10-17T00:32:19.472071+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/routes.spec.ts

## Purpose

Vitest spec that pins the `meta.access` and `meta.can` values every api-keys route must declare. It checks routes by name against the module's own raw route records (imported directly, not via a resolved router), so it needs neither a locale prefix nor the rest of the app. It exists because a route that silently loses its access meta is indistinguishable from a public one.

## Key elements

- **`byName`** — Local helper that finds a `RouteRecordRaw` in the imported `routes` array by its `name` property.
- **`it.each` block** — Parameterized assertion that `ApiKeysList` and `ApiKeyCreate` each declare the expected `meta.access` string and `meta.can` `[action, subject]` tuple.
- **Completeness test** (`declares no route this file does not know about`) — Asserts the sorted list of all route names equals exactly the two known names. Catches a newly added route that lacks an explicit access decision.

## Relationships

- **`src/modules/api-keys/routes.ts`** — The sole SUT. Imported as `routes` (the default export of the raw route-record array). All assertions read `meta` fields off these records.
- **`vue-router`** — Provides the `RouteRecordRaw` type used for the `byName` helper's return annotation.
- **`vitest`** — Test framework (`describe`, `it`, `it.each`, `expect`).

## Notes

- Expected access/permission values are written out literally in the test table rather than derived from the source, so a change to `routes.ts` without updating the test will fail visibly.
- The completeness test uses `.toSorted()` (ES2023) rather than `.sort()` to avoid mutating the mapped array.
- The file header references `docs/theory/modules.md` for the rationale that this is a *domain-local* fact check, not an integration concern.
- No mocks or app-level setup are needed; the test runs against static route metadata only.
