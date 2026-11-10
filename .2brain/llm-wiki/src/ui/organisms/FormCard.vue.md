---
source: src/ui/organisms/FormCard.vue
sha256: 2281fe2aa78ea3bac70f72605ead0967301c2f14ecbaa87f30112842500b6858
signature: 2281fe2aa78ea3bac70f72605ead0967301c2f14ecbaa87f30112842500b6858
generated_at: 2026-11-10T06:31:23.037654+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/FormCard.vue

## Purpose

A shared card layout for single-form pages (e.g. `ProductCreate`, `UserCreate`, auth pages). It fixes the card width, the `novalidate` `<form>` wrapper, the block submit button, and the optional centred "back" text link, so each page only supplies its own fields and submit logic. It is deliberately a sibling of `ItemDetailLayout` rather than a child of `LayoutDefault`, because the page owns its own layout.

## Key elements

- **`SIZE_CLASSES`** — Map of `md` / `xl` to Tailwind classes (`mt-16 max-w-md` vs `mt-10 max-w-xl`) that control card width and top margin.
- **Props** — `submitLabel`, `backTo` + `backLabel` (pair-gated back link), `size` (default `xl`), `submitColor` (default `primary`), `submitTest` (exposed as `data-test` on the submit button), `loading` (disables and spins the submit button).
- **Slots** — `before` (above form), default (the fields), `after-submit` (inside form, below button — typically a blocking error), `footer` (below form — e.g. OAuth buttons).
- **`emit('submit')`** — Fired on form submit; the owning page handles validation and the actual API call.
- **`formElement` (exposed)** — A `ref` to the `<form>` element, exposed via `defineExpose` so the parent page's `useStructureFormValidation` can focus the first invalid field.
- **`routerLinkI18n`** — Wraps `backTo` to add the locale prefix before rendering the text link.

## Relationships

- **`tests/support/e2e/touch.ts`** — The `submitTest` prop is rendered as `data-test` on the submit button, providing the hook that e2e test utilities use to locate and interact with the button.
- **`scripts/mutation/baseline.ts`** — Listed as a graph neighbor; likely involved in generating or comparing visual/structural baselines for this component in a mutation or regression pipeline.

## Notes

- The form uses `novalidate`, so browser-level validation is suppressed; the page is expected to validate via its own logic (likely `useStructureFormValidation`, which needs the exposed `formElement`).
- The `after-submit` slot is **inside** the `<form>`; `footer` is **outside**. Placing content in the wrong slot changes whether it participates in form submission.
- The back link renders only when **both** `backTo` and `backLabel` are truthy.
- `submitColor` is a free-form string (e.g. `primary`, `error`), not a union type — destructive pages pass `error`.
- Slot names follow kebab-case in templates (`#after-submit`); the TS type uses the matching key with an eslint-disable comment.
