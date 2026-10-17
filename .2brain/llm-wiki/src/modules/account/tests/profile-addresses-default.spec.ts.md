---
source: src/modules/account/tests/profile-addresses-default.spec.ts
sha256: ed8c459d5eca8bd252b5ecde2100d99579a59810297f2ee50280314cf7e14334
generated_at: 2026-10-17T00:24:24.958642+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-addresses-default.spec.ts

## Purpose
Unit tests scoped to the "set as default" checkbox in the ProfileAddresses add/edit dialog. Verifies the checkbox is hidden when the address book is empty (first address is always default server-side) or when editing an existing entry, and that checking it adds only `default: true` to the POST body — never `default: false`. Complements `addresses.spec.ts`, which covers the store's HTTP plumbing.

## Key elements
- **`mountAddresses()`** — mounts `ProfileAddresses` with Vuetify + i18n, stubbing `VDialog` (always renders slot) and `VAutocomplete` (plain `<input>` stub) so the dialog and country field behave deterministically.
- **`fillRequired(wrapper)`** — chains `setValue` calls across the five required form inputs (name, street, city, zip, country) so the add form is submittable.
- **`lastAddCall()`** — inspects the mocked `orvalMutator` call history and returns the most recent `POST /account/addresses` request object.
- **`V_COUNTRY_SELECT_STUB`** — replaces the country `v-autocomplete` with a text `<input>` so `fillRequired` can set it via `autocomplete` like every other field.
- **`responses` / `vi.mock('@/infrastructure/http')`** — per-test canned HTTP responses keyed by `METHOD /url`; the mock resolves them through `parseOrvalFixture`.
- **`HOME`** — single saved-address fixture used to make the book non-empty in the "already holds an address" suite.

## Relationships
- **`src/modules/account/components/ProfileAddresses.vue`** — the component under test; the spec asserts on its rendered DOM (`[data-test=address-set-default]`) and submitted form data.
- **`src/infrastructure/http/index.ts`** — provides `orvalMutator`, which is fully mocked here so no real HTTP occurs; the mock delegates to `parseOrvalFixture` for envelope shaping.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top level to register the account module (and its Pinia store) with the Vuetify/i18n core before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (wraps fixture data in the API's envelope shape), `parseOrvalFixture` (unwraps it in the mock), and `contractRequest` (validates the outgoing body against the generated `@api/schemas.AddAddressBody` type).

## Notes
- The test deliberately never asserts `default: false` on the wire. The backend ignores `false`, and the spec's contract is that an unchecked box simply omits the key.
- The `VDialog` stub renders its slot unconditionally, so Add→Edit visibility transitions are tested purely against the component's own `v-if="!editingId"` logic without needing to drive Vuetify's overlay open/close lifecycle.
- `flushPromises` is threaded through the `.then()` chains (not used as a top-level await) to match the project's existing async-test style seen in sibling specs like `record-offline-payment-form.spec.ts`.
