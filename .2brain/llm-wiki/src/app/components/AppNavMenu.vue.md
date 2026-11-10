---
source: src/app/components/AppNavMenu.vue
sha256: 4a74b4b438c8739337a226a1f1439d8a62a21e5e3405ed5a63888950377239de
signature: 0da9b6c15ed267c95caaa2e89fe49194b49b6b33ba0d6f91d8c7bd02392c3894
generated_at: 2026-11-10T02:50:12.101833+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavMenu.vue

## Purpose

A generic dropdown-menu shell that wraps `AppNavIconButton` and renders an array of `AppNavItem`s inside a Vuetify `v-menu` with `role="menu"` semantics. It serves both the account menu and the admin menu, giving them a shared keyboard contract (ArrowDown opens, arrows navigate, Escape closes) and an ARIA-correct menu/menuitem structure.

## Key elements

- **Props** (`defineProps`): `items`, `label`, `icon`, `description`, `badge`, `avatar`, `avatarUrl`, `avatarThumbnailUrl`, `dataTest`, `tour`. The avatar trio is used only by the account menu; `dataTest` and `tour` are forwarded to the activator for e2e and guided-tour targeting.
- **`menuOpen`** (`ref<boolean>`): Two-way-bound to `v-menu`; read by `focusFirstItemOnOpen` to guard against a stale `afterEnter` after a very fast Escape-close.
- **`listElement`** (`ref<ComponentPublicInstance | null>`): Template ref on the inner `v-list`; used to query for the first `[role="menuitem"]` for focus.
- **`focusFirstItemOnOpen`**: Fallback for the WAI-ARIA APG menu-button pattern. Fires on `v-menu`'s `@after-enter`; if focus isn't already inside the menu, moves it to the first menuitem. Protects against Vuetify's own `focusChild()` call landing while the content is still `visibility: hidden` (a silent no-op under load).
- **Template structure**: `v-menu` → activator slot renders `AppNavIconButton`; content is a `v-list[role="menu"]` containing an optional `v-list-subheader` (description), repeated `v-list-item[role="menuitem"]` entries with optional group headings, per-item badges, and a `#after` slot for non-navigation actions (e.g. logout).

## Relationships

No graph neighbors are tracked in the dependency graph for this file.

## Notes

- Group subheaders are rendered only when `item.group` differs from the previous item's group, producing one heading per contiguous run.
- Both the description subheader and group subheaders carry `aria-hidden="true"` because a heading is not a permitted child of a `menu` role per ARIA; the information is redundant for screen readers (activator name / item titles already convey it).
- `focusFirstItemOnOpen` guards on `content.contains(document.activeElement)` rather than checking whether focus is specifically on the activator — by `afterEnter`, Vuetify's own `focusChild()` has usually already succeeded.
- The `#after` slot is intentionally open-ended: it is the escape hatch for actions that belong in the menu but are not navigation links (e.g. a logout button).
