---
source: src/modules/products/tests/product-edit-release-date.spec.ts
sha256: f7bc2ccf4d284c82552497334d4c46144fa4eb139b7fc99d8318c7bd9ad0cd11
signature: f75a4b646048951c586683fd81311e49d66153e3d517e2ec5bf884bad6bf7ea7
generated_at: 2026-11-10T05:27:40.054210+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-release-date.spec.ts

## Purpose

Vitest spec for the release-date field in the ProductEdit form. It verifies the hydration of the date into the `<input>`, the deliberate omission of an unchanged date from the PATCH body (a moved date notifies buyers who already paid, so it travels only on change), the correct wire format for edited/cleared dates, and the confirmation-dialog flow that warns staff about how many orders will receive an email before a date change is saved. Assertions are validated against the API contract's own body schema.

## Key elements

- **`mountHydrated(adminRecord)`** – Mounts `ProductEdit`, resolves locales then the admin GET on deferred promises so the tab bar is open and the form is fully hydrated before the test acts.
- **`deferred<T>()`** – Creates a `{ promise, resolve }` pair used to sequence locale → admin-record resolution.
- **`lastPatch()`** – Finds the most recent `orvalMutator` call with `method === 'PATCH'` and returns its config (throws if none).
- **`echo(body)`** – Spreads extra fields onto a minimal valid product record for the post-submit reload.
- **`signIn(rules)`** – Populates `useSessionStore` with a token, viewer, and CASL ability so permission-gated code paths execute.
- **`submitWith(impact, next, original)`** – Higher-level helper for the preview-dialog tests: mounts, overrides the `orvalMutator` mock to answer the impact endpoint, sets the date input, and submits.
- **`describe('ProductEdit — release date')`** – Five tests covering: display, omission when untouched, send-as-string when changed, send-`null` when cleared, omit when never had a date.
- **`describe('ProductEdit — the preview before a changed date')`** – Tests the `/delivery/fulfillment-orders/release-date-impact` preview call, the `useDialogStore().confirm` dialog (order count, singular/plural, warning color), and the abort path when staff decline.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** – The component under test; mounted via `@vue/test-utils` with `props: { id: 'p1' }`.
- **`src/infrastructure/http/index.ts`** – The module from which `orvalMutator` is imported; its behavior is replaced at the module boundary so every HTTP call the form makes is intercepted and inspected by URL/method.
- **`tests/support/unit/orval-fixture-schema.ts`** – Provides `parseOrvalFixture` (generates a schema-conformant response body from the generated client) and `contractRequest` (validates a request body against the API schema before asserting on its shape).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` registers enabled modules into the kernel so `collectModuleRoutes` produces real routes for the memory-history router.

## Notes

- **Omission is the key assertion.** An unchanged or never-present `releaseDate` must be *absent* from the PATCH body (`not.toHaveProperty`), not `null`. Only an explicit clear sends `null`.
- **PATCH, never PUT.** The generated orval client sends `method: 'PATCH'` (uppercase); `lastPatch` matches that exact case. This is deliberate per the project's Q10 decision.
- **Sequencing matters.** The `deferred` pattern exists because the admin record must resolve *strictly after* locales, or the tab bar (and thus the date field) never renders. This mirrors the same pattern in `product-edit-locale-race.spec.ts`.
- **Preview dialog is spied, not mounted.** `useDialogStore().confirm` is replaced with a `vi.spyOn` mock; the dialog host component is never rendered.
- **Singular/plural copy** is asserted verbatim (`'1 order gets an email…'` vs `'12 orders get an email…'`), tying the test to UI copy.
