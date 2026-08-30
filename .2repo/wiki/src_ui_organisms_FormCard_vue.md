# src/ui/organisms/FormCard.vue

## Purpose
Shared card shell for single-form pages (create/edit). It fixes the layout decisions that all such pages agree on — card width, `novalidate` form, block submit button, centred back link — so each concrete page only supplies its own fields and submit logic.

## Key elements
- **`defineProps`** — `submitLabel` (translated button text), `backTo` (RouteLocationRaw), `backLabel` (translated link text), `loading` (disables/spins the button).
- **`defineEmits<{ submit: [] }>`** — fired on form submit; the owning page performs validation and the actual request.
- **`formElement` ref + `defineExpose`** — exposes the `<form>` DOM node so a parent one level up can call `useAppForm` and focus the first invalid field inside it.
- **Default slot** — the page's form fields go here.
- **Template** — `v-card` (max-w-xl, centred) → `<form novalidate>` → slot → `v-btn` submit → `v-btn` text link via `routerLinkI18n(backTo)`.

## Relationships
No graph neighbors are recorded. The file imports `routerLinkI18n` from `@/infrastructure/i18n/router-link.ts` and the `RouteLocationRaw` type from `vue-router`.

## Notes
- `novalidate` is always on; the page is responsible for validation.
- Deliberately **not** wrapped in `LayoutDefault` (same reasoning as `ItemDetailLayout`): the page owns its own layout, and a card that ships its own layout container would conflict with a page that already provides one.
- `formElement` is exposed rather than handled internally because the form-state owner (`useAppForm`) lives in the parent page, not in this component.
