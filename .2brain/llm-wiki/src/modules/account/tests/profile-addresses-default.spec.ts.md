---
source: src/modules/account/tests/profile-addresses-default.spec.ts
sha256: 5104801ecf0080bc714fb5ff53cabd730327660d18524a21799fa2a66ef11b9e
signature: 8a97515496d380e622c853281f2288beaf3783ec8e7b9cf5be4cdb7cf46d780f
generated_at: 2026-11-10T03:38:12.857807+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-addresses-default.spec.ts

## Purpose

Unit tests scoped to the **"set as default" checkbox** in the ProfileAddresses add-address dialog. It verifies three UI decisions: the checkbox is hidden when the address book is empty (first address is default server-side), hidden again when editing an existing entry, and — when visible and checked — the POST body gains only `default: true`; when unchecked the key is omitted entirely (never `default: false`). Store-level PATCH/POST plumbing is covered separately in `addresses.spec.ts`.

## Key elements

- **`mountAddresses()`** – mounts `ProfileAddresses.vue` with a pass-through `VDialog` stub and a plain-`<input>` `VAutocomplete` stub so the checkbox's `v-if` visibility is observable without driving Vuetify overlay state.
- **`fillRequired(wrapper)`** – sets the five required form fields via `autocomplete` attributes so the add form is valid for submission.
- **`lastAddCall()`** – pulls the raw body of the most recent `POST /account/addresses` call from the mocked `orvalMutator`.
- **`V_COUNTRY_SELECT_STUB`** – replaces `v-autocomplete` (country) with a plain text `<input>` so `fillRequired` can treat it identically to the other fields.
- **`HOME`** – single-address fixture used to make the book non-empty.
- **`vi.mock('@/infrastructure/http')`** – intercepts `orvalMutator` and routes through `parseOrvalFixture` with per-test canned responses keyed by `METHOD /url`.
- **`describe('an empty address book')`** – asserts the checkbox does not exist when no addresses are loaded.
- **`describe('a book that already holds an address')`** – asserts checkbox appears on Add but disappears on Edit, and that the POST payload contains `default: true` (validated via `contractRequest`) when checked, or omits `default` entirely when unchecked.

## Relationships

- **`ProfileAddresses.vue`** – the component under test; imported and mounted directly.
- **`src/infrastructure/http/index.ts`** – source of `orvalMutator`; mocked at module level so no real HTTP occurs.
- **`tests/support/unit/orval-fixture-schema.ts`** – provides `parseOrvalFixture` (shape-checks canned responses) and `contractRequest` (validates outgoing request bodies against `@api/schemas` types).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` registers account-module stores into the Pinia core so the component can resolve its store dependencies during mount.

## Notes

- The test never asserts `default: false` on the wire; the component omits the key entirely when unchecked. This is intentional — the backend ignores `false`, and the test documents that the UI never even emits it.
- Because `VDialog` is stubbed to render its slot unconditionally, the edit-vs-add visibility test relies solely on the component's internal `editingId` state (its `v-if`), not on dialog open/close cycles.
- Field selection in `fillRequired` uses `autocomplete` attributes rather than labels or indices, keeping the helper resilient to template reordering.
