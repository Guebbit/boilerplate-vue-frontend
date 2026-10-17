---
source: src/modules/observability/tests/admin-audit-tab.spec.ts
sha256: 660dcffba43459ca59266f77b915e493ef5e4db1ecd83e1201350737abfbfbb5
generated_at: 2026-10-17T01:12:00.669743+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/admin-audit-tab.spec.ts

## Purpose

Component-level test for `AdminAuditTab.vue` that covers the self-fetching behavior the `use-audit-trail.spec.ts` hook test does not: verifying that mounting the component fires the initial request, that the `target` prop is forwarded into the request payload, and that submitting the filter form re-fetches through the same endpoint.

## Key elements

- **`vi.mock('@api', …)`** — Replaces `listObservabilityAuditEntries` and `listAuditEntries` with mocks that resolve `contractResponse(…)`-built empty pages.
- **`EMPTY_PAGE`** — Shared fixture (`items: []`, zero-count `meta`) returned by both mocked endpoints.
- **`mountTab(props)`** — Helper that mounts `AdminAuditTab` with Vuetify and i18n plugins; accepts `endpoint: 'platform' | 'shop'` and optional `target`.
- **`describe('endpoint selection')`** — Three tests asserting the correct API function is called on mount for each endpoint, and that a `target` prop is merged into the shop request.
- **`describe('the filter form')`** — Submits the form after setting the text input, then asserts `listAuditEntries` is called with the `actor` value and `page: 1`.
- **`wireModulesIntoCore()`** (from `wire-modules.ts`) — Called once at module scope to register DI providers before any test runs.

## Relationships

- **`src/modules/observability/components/AdminAuditTab.vue`** — The SUT; this spec mounts it and drives its props/form.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, which wires the DI container so the component's injected services resolve during tests.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `contractResponse`, which wraps a raw fixture with the generated Orval schema so mocked responses pass any schema validation the component or its utilities might perform.

## Notes

- The file's doc-comment explicitly scopes itself as complementary to `use-audit-trail.spec.ts`; it does **not** re-test the composable's filtering/pagination logic, only the component's wiring.
- Mocks are cleared via `vi.clearAllMocks()` in `beforeEach`; the filter-form test additionally calls `mockClear()` on `listAuditEntries` after the initial mount fetch to isolate the submit-triggered call.
- `loadLocale('en')` is awaited in `beforeEach` to ensure i18n strings are available before the component renders.
