---
source: src/modules/products/tests/product-edit-stale-record.spec.ts
sha256: e72bf88fbb2134b57d5cd5fb2ab4a845c4ec81acfad6213e78481710ae577742
generated_at: 2026-10-02T15:37:00.729708+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-stale-record.spec.ts

## Purpose

Verifies the ProductEdit form's UX when a PATCH save is rejected with HTTP 412 (the product was modified after the form loaded). Confirms the form surfaces a **warning** (not an error), exposes a "reload latest" action that re-fetches the admin record, and never silently resubmits the stale edit.

## Key elements

- **`mountRefused()`** — helper that wires `orvalMutator` to resolve `/locales` and `/products/p1/admin` via `parseOrvalFixture`, rejects any PATCH with the `PRECONDITION_FAILED` envelope, then mounts `ProductEdit` and awaits `flushPromises`.
- **`PRECONDITION_FAILED`** — the rejection envelope (`status: 412`, `errors[].code: 'PRECONDITION_FAILED'`) that `onResponseReject` is expected to shape into a user-facing warning.
- **`adminReads()`** — counts how many times the mocked `orvalMutator` was called with `url === '/products/p1/admin'`; used to assert the reload button triggers exactly one additional GET.
- **`echo()`** — builds a minimal valid admin-record body for the GET response so the post-reload form has data to land on.
- **Three `it` blocks** under `describe('ProductEdit — a save answered 412')`:
  1. Warns in place (`data-test=product-edit-submit-error`, class `warning`) and shows the reload button.
  2. Clicking reload increments admin-read count by one and clears both the warning and the button.
  3. After submit + flush, exactly **one** PATCH call was made (no automatic resubmit).

## Relationships

- **`src/infrastructure/http/index.ts`** — source of `orvalMutator`; fully replaced by `vi.mock('@/infrastructure/http')` so the test controls every outbound request.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` registers module-level DI/side-effects before the router and Pinia are created, ensuring `ProductEdit` resolves its dependencies.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` and `parseOrvalFixture` to build spec-valid response fixtures for the mocked HTTP layer.

## Notes

- The spec deliberately does **not** assert on the PATCH request body shape; only the 412 rejection path matters.
- `mountRefused` resolves the admin-read URL (`/products/p1/admin`) with a *fresh* `echo({})` every time, so the "reload latest" assertion depends solely on call-count, not on differing payloads.
- The `// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors` is intentional: the rejection value is the API's error **envelope** (a plain object), not an `Error` instance, matching the client's rejection contract.
- Router is a `createMemoryHistory` instance with `/:locale` wrapping `collectModuleRoutes(enabledModules)`; the test always pushes `/en/products/p1/edit`.
