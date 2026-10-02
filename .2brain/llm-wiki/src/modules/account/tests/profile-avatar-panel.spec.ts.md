---
source: src/modules/account/tests/profile-avatar-panel.spec.ts
sha256: 365585f15d41e2a7c7980956b2c2b8735a2fb3a08061ada0498c9c85d920a296
generated_at: 2026-10-02T12:28:16.331300+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-avatar-panel.spec.ts

## Purpose

Unit test for the `ProfileAvatar.vue` component's remove-button visibility. It verifies that the remove control is rendered only when the account record carries an `imageUrl`, and is absent when it does not.

## Key elements

- **`profile`** (module-level `Ref`) — the single piece of state the mocked store exposes; each test sets `profile.value` before mounting.
- **`vi.mock('@/modules/account/stores/profile.ts', …)`** — replaces the real Pinia store with a plain object returning `profile`, two `ref(false)` loading flags, and a `vi.fn()` `updateProfile`. Avoids needing a transport to seed data.
- **`mountPanel(imageUrl?)`** — helper that assigns `profile.value` and mounts `ProfileAvatar` with `vuetify` + `i18n` plugins.
- **`describe('ProfileAvatar — the remove button')`** — two `it` blocks asserting the `[data-test=profile-avatar-remove]` element exists / is absent.

## Relationships

- **`ProfileAvatar.vue`** (`@/modules/account/components/ProfileAvatar.vue`) — the component under test; the spec mounts it and asserts on its rendered DOM.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module top-level to wire mocked module registrations into the test runtime before any component mount.
- **`@/i18n`** and **`@/ui/vuetify`** — provided as global plugins so the component's locale strings and Vuetify directives resolve during mount.
- **`@/modules/account/stores/profile.ts`** — fully replaced by the `vi.mock` factory; the real store is never loaded.

## Notes

- The mock factory references the module-level `profile` ref. This works because Vitest hoists the `vi.mock` call but defers factory execution until the mocked module is first imported (during `mount`), at which point `profile` is already initialised. Do not move `profile` into the factory without also adjusting the test bodies.
- `setActivePinia(createPinia())` runs in `beforeEach` even though the mock bypasses Pinia entirely; it satisfies any transitive `useProfileStore()` call that might still touch the Pinia context. Remove it only if the mock contract changes.
- Tests target the `data-test=profile-avatar-remove` attribute, not a CSS class or role — the selector is the contract between this spec and the component template.
