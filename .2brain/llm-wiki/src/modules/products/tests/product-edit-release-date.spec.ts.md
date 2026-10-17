---
source: src/modules/products/tests/product-edit-release-date.spec.ts
sha256: 59cea267a035c0f0a666ca6334e67d1a80a83fdf3f5638554390463b66f478e9
generated_at: 2026-10-17T01:31:58.001791+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-release-date.spec.ts

## Purpose

Vitest spec that verifies the release-date field of the product edit form: it is hydrated from the admin record into a `datetime-local` input, **excluded** from the PATCH body when the user does not change it (since a moved date notifies buyers who already paid), sent as an ISO instant when changed, and sent as `null` when explicitly cleared. All assertions are validated against the generated API contract's body schema.

## Key elements

- **`deferred<T>()`** — Returns a `{ promise, resolve }` pair used to control the resolution order of HTTP responses (locales must land before the admin record, or the tab bar never opens).
- **`echo(body)`** — Builds a minimal valid admin-record response for the post-submit reload.
- **`lastPatch()`** — Scans `orvalMutator`'s mock calls for the most recent `PATCH` and returns its config; throws if no PATCH was sent.
- **`mountHydrated(adminRecord)`** — Mounts `ProductEdit` with a mocked `orvalMutator`, resolves locales first, then the admin record, and returns a fully hydrated wrapper.
- **`describe('ProductEdit — release date')`** — Five test cases:
  - Renders an existing date in the browser's local zone.
  - Omits `releaseDate` from the PATCH when the value is untouched.
  - Serialises a changed date as an ISO instant accepted by `UpdateProductByIdBody`.
  - Sends `releaseDate: null` when the input is cleared.
  - Omits `releaseDate` entirely when the product never had one.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** — The component under test; this spec mounts it and drives its form.
- **`src/infrastructure/http/index.ts`** — Provides `orvalMutator`, which is fully mocked (`vi.mock`) so the spec can inspect outgoing request bodies.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module load to register modules with the kernel registry before the router collects routes.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Supplies `parseOrvalFixture`, `orvalEnvelope`, and `contractRequest`, which validate mock responses and PATCH payloads against the generated Orval schemas.

## Notes

- The `lastPatch()` helper filters by `method === 'PATCH'` (uppercase) because the generated client always uppercases the method string, whereas `parseOrvalFixture` performs its own case-insensitive lookup. This asymmetry is intentional and documented inline.
- The deferred-promise ordering (locales → flush → admin record → flush) is a hard requirement: if the admin record resolves before locales, the tab bar component never mounts and the date input is absent from the DOM.
- The spec mirrors the mounting setup of `product-edit-purchasable.spec.ts`; keep both in sync if the hydration sequence changes.
