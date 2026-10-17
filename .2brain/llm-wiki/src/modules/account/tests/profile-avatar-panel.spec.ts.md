---
source: src/modules/account/tests/profile-avatar-panel.spec.ts
sha256: 4189c40adb71bd9ed54938b8f192ada534378e5d037d51d9d01fa2fb522a2071
generated_at: 2026-10-17T00:24:43.158764+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-avatar-panel.spec.ts

## Purpose

Unit tests for the remove-button behavior in `ProfileAvatar.vue`: the button is rendered only when the account currently has a picture (`imageUrl` present) and is hidden when it does not. Exists to pin down that conditional visibility contract.

## Key elements

- **`profile`** – Module-level `ref` holding `{ imageUrl?: string } | undefined`; mutated before each mount to simulate different account states.
- **`vi.mock('../stores/profile.ts', …)`** – Replaces the real profile store with a plain object exposing `profile`, `uploadingAvatar`, `removingAvatar`, and a no-op `updateProfile`, avoiding any transport dependency.
- **`mountPanel(imageUrl?)`** – Helper that sets `profile.value` and mounts `ProfileAvatar` with the Vuetify and i18n plugins. Returns the `VueWrapper`.
- **`describe('ProfileAvatar — the remove button')`** – Two `it` blocks asserting the `[data-test=profile-avatar-remove]` element is present when `imageUrl` is set and absent when it is not.

## Relationships

- **`src/modules/account/components/ProfileAvatar.vue`** – The SUT; this spec mounts it directly and queries its DOM.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, called at module scope to ensure shared module aliases resolve in the Vitest environment.

## Notes

- The mock is declared at module scope (top-level `vi.mock`), so it applies before any import is resolved; the real store is never instantiated.
- Element queries use `data-test` attributes, not class names, so refactors that rename classes won't break these tests.
- `profile` is a shared mutable ref; tests rely on `mountPanel` resetting it before each mount rather than a `beforeEach` reset.
