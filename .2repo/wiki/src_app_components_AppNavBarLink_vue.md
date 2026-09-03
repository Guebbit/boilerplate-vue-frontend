# src/app/components/AppNavBarLink.vue

## Purpose

Renders a single desktop navigation-bar entry: a text button (Vuetify `v-btn`) that displays a lucide glyph followed by a full translated label, with an optional count badge anchored over the glyph. It exists as the text-based counterpart to `AppNavIconButton`, where the visible label itself serves as the accessible name (no `aria-label` or tooltip needed).

## Key elements

- **Props** (via `defineProps`):
  - `label: string` — visible, already-translated text.
  - `icon: Component` — lucide icon component rendered at 18 px, `aria-hidden`.
  - `to: RouteLocationRaw` — locale-prefixed vue-router destination.
  - `badge?: number` — count shown on the glyph; `0` or absent hides the badge.
  - `badgeLabel?: string` — accessible name for the badge (e.g. "3 items").
- **Template**: A `v-badge` (color `primary`, location `top start`, offset-x 16) wraps a `v-btn variant="text"`. The icon and a `<span class="ml-2 capitalize">` for the label live inside the button.

## Relationships

No graph neighbors are listed. The file references `AppNavIconButton` in comments as a sibling component sharing the same badge-wrapping pattern.

## Notes

- The badge **wraps** the button rather than nesting inside `v-btn`; nesting would hide the count.
- Badge visibility uses `:model-value="Boolean(badge)"` instead of `v-if` so the underlying link element is never destroyed/created — focus is preserved when the count changes.
- `data-test="nav-badge"` is applied only when a badge is present, making the "no badge" state testable.
- The label span uses a local `capitalize` class to match the drawer's text treatment, independent of any parent `text-transform`.
- The icon is marked `aria-hidden="true"` because the visible label is the sole accessible name.
