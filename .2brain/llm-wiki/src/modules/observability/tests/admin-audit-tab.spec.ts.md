---
source: src/modules/observability/tests/admin-audit-tab.spec.ts
sha256: 63414dc6c9656501f26817781e45f7a0eee6700dc7dc1ef9f71a02fac577b88f
generated_at: 2026-10-02T15:18:12.143078+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/admin-audit-tab.spec.ts

## Purpose

Vitest spec for `AdminAuditTab.vue` that covers the self-fetching behavior not exercised by `use-audit-trail.spec.ts`: verifying that mounting the component triggers the correct initial API call per `endpoint` prop, that the `target` prop is forwarded into shop-tenant requests, and that submitting the filter form re-fetches through the same endpoint with the query parameters applied.

## Key elements

- **`mountTab(props)`** — helper that mounts `AdminAuditTab` with the given `endpoint`/`target` props and registers the `vuetify` and `i18n` plugins globally.
- **`@api` module mock** — replaces `getObservabilityAuditLogs` and `listAuditEntries` with `vi.fn` stubs that resolve an empty page shaped by `contractResponse` + generated schemas.
- **`describe('endpoint selection')`** — three tests asserting platform vs. shop route selection on mount and that `target` is merged into the shop request body.
- **`describe('the filter form')`** — one test that types into the text input, submits the form, and asserts the re-fetch carries `actor` and `page` in the same endpoint call.
- **`EMPTY_PAGE`** — shared fixture constant (`items: []`, zeroed meta) used as the mock response payload.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope so the component's dependency-injection graph resolves before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — `contractResponse(schemas.…, payload)` is used to build spec-conformant mock responses from the generated OpenAPI schemas, keeping the mocks aligned with the real API contract.

## Notes

- The mock is set up with a factory (`vi.mock('@api', () => …)`), so both API functions always return the *same* `EMPTY_PAGE` shape regardless of arguments; assertions rely on call counts and `expect.objectContaining` rather than response data.
- `loadLocale('en')` is called in `beforeEach` to ensure the i18n plugin has a loaded locale before the component renders its labels.
- The file intentionally complements (not duplicates) `use-audit-trail.spec.ts`; it focuses on the component-level fetch triggers and prop wiring, not the composable's internal state machine.
