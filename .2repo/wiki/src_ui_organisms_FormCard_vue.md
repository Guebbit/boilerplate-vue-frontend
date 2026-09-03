# src/ui/organisms/FormCard.vue

## Purpose

A presentational card that wraps a single-form page (e.g. `ProductCreate`, `UserCreate`) with its fixed chrome: a `novalidate` form, a full-width submit button, and a centred "back" text link. The caller supplies only the fields (via the default slot) and the i18n labels, so every create page shares the same card geometry and button layout without duplicating markup.

## Key elements

- **Props** — `submitLabel`, `backTo` (a `RouteLocationRaw`), `backLabel`, `loading?`. Labels arrive already translated; `backTo` gets its locale prefix added internally via `routerLinkI18n`.
- **`emit('submit')`** — fired on `<form>` submit; the owning page handles validation and the actual submission.
- **`defineExpose({ formElement })`** — exposes the `<form>` ref so `useStructureFormValidation` (one level up) can focus the first invalid field without reaching into the DOM.
- **Default slot** — the page's own form fields; this is the only variable part of the card.
- **`routerLinkI18n`** (from `@/infrastructure/i18n/router-link.ts`) — wraps `backTo` so the locale prefix is applied before Vuetify's `<v-btn :to>` renders the link.

## Relationships

- **Sibling of `ItemDetailLayout`** — both are page-level organisms that a single page composes; they are deliberately kept *out* of `LayoutDefault` so a page that already owns its layout isn't forced to nest two card wrappers.
- **`routerLinkI18n`** — imported for the back-link; the only external dependency beyond Vue/Vuetify.

## Notes

- The form has `novalidate`; validation is the page's responsibility, not the card's. The card only emits `submit` and lets the parent decide whether to proceed.
- `loading` spins the submit button and (via Vuetify's built-in disabled-while-loading) blocks a second submit. There is no manual `:disabled` binding.
- Because the component is a "page-level organism," do not nest it inside another organism that already provides a card or layout container.
- The card width is hard-coded (`max-w-xl`, `p-8`, `mx-auto mt-10`). If a future page needs a different width, that is a signal to either parameterise or fork — the design intent is that all create pages look identical.
