---
source: src/modules/users/composables/use-user-summary.ts
sha256: 9865565b58ed1ce2191a5233734a78e7e10cbe3edebf480295188d7c3991fca2
signature: ee28334780ff0c388cb7c2eb91a8c8a5b7691b98b3d592378844356f59c26cf0
generated_at: 2026-11-10T06:04:10.030097+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/composables/use-user-summary.ts

## Purpose

Shared composable that derives the four read-only labels (hero heading, hero subheading, role chip, status chip) shown about the routed user record on both user pages. It centralises the wording logic in one place so each consuming view only manages its own store read.

## Key elements

- **`useUserSummary(user, id, fallbackTitleKey)`** — the sole export. Accepts a reactive `Ref<User | undefined>`, a getter for the route id, and an i18n key for the page title. Returns four `computed` refs:
  - `heroTitle` — username → route id → translated page title (fallback chain).
  - `heroDescription` — user email via `formatText`, or the empty-value glyph.
  - `userRole` — raw role name via `formatText` (deliberately **not** translated).
  - `userStatus` — localised "enabled"/"disabled" via `formatFlag`, or the empty-value glyph.
- Depends on `useI18n` (`t`) and the `formatFlag` / `formatText` helpers from `@/infrastructure/utils/formatters.ts`.

## Relationships

- **Consumed by** `UserEdit.vue` and `UserTarget.vue` — each view calls `useUserSummary` with its own loaded-user ref, route-id getter, and page-title key, then binds the four returned refs in its hero section.

## Notes

- `id` is a **getter function**, not a `Ref`, so that a destructured route prop passed from a view stays reactive inside the composable.
- `userRole` is intentionally left untranslated: roles are deployment-specific data, and only the permission rules (not the label) matter to the app.
- All four returns are pure `computed`s — no watchers, no side-effects, no async work. Safe to call once per component setup.
