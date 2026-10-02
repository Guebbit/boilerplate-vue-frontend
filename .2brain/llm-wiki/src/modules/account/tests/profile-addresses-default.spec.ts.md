---
source: src/modules/account/tests/profile-addresses-default.spec.ts
sha256: 8dab4f95142014ad9e85deb9261a2ee4b908a67e518589f76dd9a7488dd7737a
generated_at: 2026-10-02T12:27:28.685389+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-addresses-default.spec.ts

## Purpose

Unit tests scoped to the "set as default" checkbox in the add-address dialog (FE_PARITY_0924 A3). Verifies three UI decisions: the checkbox is hidden when the address book is empty (first address is default server-side), hidden again when editing an existing entry, and—when visible and checked—adds only `default: true` to the POST body, never `default: false`. Complements `addresses.spec.ts`, which covers the store's PATCH/POST plumbing.

## Key elements

- **`mountAddresses()`** – Mounts `ProfileAddresses.vue` with Vuetify/i18n plugins, a `VDialog` stub that always renders its slot, and a `VAutocomplete` stub (plain `<input>`) so `fillRequired` can set the country field uniformly.
- **`fillRequired(wrapper)`** – Chains `.setValue()` on the five required form inputs (name, street, city, zip, country) so the dialog form is submittable.
- **`lastAddCall()`** – Helper that extracts the most recent `POST /account/addresses` call from the mocked `orvalMutator`'s call log.
- **`V_COUNTRY_SELECT_STUB`** – Minimal `VAutocomplete` replacement rendering an `<input>` bound to `modelValue`/`update:modelValue`.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a mock that looks up a `responses` map by `METHOD url` key and returns a parsed Orval fixture.
- **`HOME`** – A single saved address fixture used to make the book non-empty.
- **Test groups** – `describe('an empty address book')` and `describe('a book that already holds an address')`, each containing assertions on checkbox visibility and request-payload shape.

## Relationships

- **`src/infrastructure/http/index.ts`** – The file's only HTTP dependency; `orvalMutator` is mocked at module level so no real network calls occur. The mock reads from a `responses` record keyed by `METHOD /path`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level (before any test) to register the component's Pinia stores and other DI into the test runtime.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` (wraps a payload in the expected Orval response shape), `parseOrvalFixture` (decodes the mock's return value), and `contractRequest` (validates a request body against a generated schema before assertion).

## Notes

- The `VDialog` stub renders unconditionally; visibility of the checkbox is driven solely by the component's own `v-if` on `editingId` and list length. No need to "open" the dialog via Vuetify overlay state.
- The unchecked-checkbox test asserts the `default` key is **absent** from the request body (`.not.toHaveProperty('default')`), not merely `false`—this guards against a regression that would serialize `default: false` onto the wire.
- The edit-mode test opens the edit dialog *without closing the add dialog first* (the stub renders both slots). The assertion still isolates the `editingId`-driven `v-if` correctly.
- `loadLocale('en')` is awaited in `beforeEach` so i18n keys resolve before the component mounts.
