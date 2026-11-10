---
source: src/modules/account/tests/profile-avatar-panel.spec.ts
sha256: 14c1e123fcd0d849fd996768879608fab383673bf68b6b365db1ed9fe8f159a3
signature: 41c049d36caa25abb6c1278ee96cb7451a7feca04b5ae39f689641d992edf5c8
generated_at: 2026-11-10T03:38:33.664736+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-avatar-panel.spec.ts

## Purpose

Vitest spec that verifies the remove-button behavior on `ProfileAvatar.vue`: the button appears only when the account has a stored `imageUrl`, is absent otherwise, and triggers exactly one `updateProfile` call even if the user double-clicks before the first dialog resolves.

## Key elements

- **`mountPanel(imageUrl?)`** — Test helper that sets the shared `profile` ref to the given value and mounts `ProfileAvatar` with Vuetify + i18n plugins. Returns the Vue Test Utils wrapper.
- **`updateProfile`** (`vi.fn()`) — Shared mock for the store's write action; tests assert call counts against it.
- **`profile`** (`ref<{ imageUrl?: string } | undefined>`) — Mutable reactive record the mocked store exposes; tests set it via `mountPanel` before mounting.
- **`vi.mock('../stores/profile.ts', …)`** — Factory-mocks the account profile store, returning an object that exposes `profile`, `uploadingAvatar`, `removingAvatar`, and `updateProfile`, eliminating the need for a real transport.
- **`describe('ProfileAvatar — the remove button')`** — Three cases:
  - Button exists when `imageUrl` is set.
  - Button is absent when `imageUrl` is undefined.
  - Rapid double-click yields exactly **one** `confirm` call and **one** `updateProfile` call (idempotency / double-submit guard).

## Relationships

- **`src/modules/account/components/ProfileAvatar.vue`** — The component under test; this spec imports it directly and mounts it with global plugins.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called once at module scope before any test runs to register Vuetify/i18n/Pinia side-effects that the component (or its children) expect at mount time.

## Notes

- The mock for `../stores/profile.ts` is a **factory mock** (`vi.mock` with a factory), so the real store file is never loaded. This means the test does not exercise the real Pinia store registration; it only verifies the component's contract with whatever object the store happens to expose.
- The double-click test relies on `updateProfile.mockResolvedValue(undefined)` being set **before** the first click; forgetting that line would leave the mock returning `undefined` (still fine), but the intent is to simulate an async round-trip.
- `wireModulesIntoCore()` is invoked at the **top level** of the module (not inside `beforeEach`), so it runs once for the entire spec file. If it mutates global state, test-order sensitivity is a risk if other spec files run in the same worker without a clean teardown.
