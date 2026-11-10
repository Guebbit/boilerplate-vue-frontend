---
source: src/modules/account/tests/confirm-once.spec.ts
sha256: 15c1417d2fdcb9179e6079f07fac04c2200f0e5c37b6044d6a47949c4a351edd
signature: b3870361bda8eaf375a37dc84dd766070416d60034f2d122dcf6846f69263c9a
generated_at: 2026-11-10T03:31:19.401967+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/confirm-once.spec.ts

## Purpose

Guards against a race in the account panels where a user double-clicks a "confirm-then-write" control (remove address, delete account, log out everywhere). Each test fires two clicks in the same tick, answers the confirm dialog "yes", and asserts that the dialog was asked exactly once and the destructive store action was called exactly once.

## Key elements

- **`pressTwice(button)`** — Test helper. Spies on `useDialogStore().confirm` (mock-resolved `true`), fires two `click` events on the button via `Promise.all`, flushes promises, and returns the confirm spy. The caller then asserts call counts.
- **`OFFICE`** — A single mock address object used to seed the addresses store.
- **`router`** — A bare `createRouter` with no routes; provided because the panels only need an instance to navigate with.
- **Three `it` blocks** — One per component:
  - `ProfileAddresses`: mocks `removeAddress`, asserts one confirm + one remove.
  - `ProfileDeleteAccount`: mocks `requestAccountDelete`, asserts one confirm + one request.
  - `ProfileSessions`: mocks `logoutEverywhere`, asserts one confirm + one logout.

## Relationships

- **`src/modules/account/components/ProfileAddresses.vue`, `src/modules/account/components/ProfileDeleteAccount.vue`, `src/modules/account/components/ProfileSessions.vue`** — The components under test. Mounted with `@vue/test-utils` and interacted with via their `data-test` attributes or `button` selector.
- **`src/modules/account/stores/addresses.ts`, `src/modules/account/stores/profile.ts`, `src/modules/account/stores/sessions.ts`, `src/modules/account/stores/auth.ts`** — Pinia stores whose actions are spied/mocked (`removeAddress`, `requestAccountDelete`, `fetchSessions`, `logoutEverywhere`). The stores themselves are not replaced; individual methods are intercepted.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called at module scope before tests run to set up global test wiring.

## Notes

- The test does **not** use `vi.useFakeTimers`; "same tick" is achieved by issuing both `trigger('click')` calls before any `await`, then flushing. This means it only catches the double-press race, not slow-network retries.
- `pressTwice` returns the spy itself (not a count), so assertions are written as `expect(confirm).toHaveBeenCalledTimes(1)` at the call site.
- `ProfileAddresses` is mounted **without** a router; the other two panels include the dummy router in their `global.plugins`. If a new panel is added, check whether it requires a router and add it accordingly.
- The file imports stores with an explicit `.ts` extension (e.g., `../stores/addresses.ts`), matching the project's ESM import convention.
