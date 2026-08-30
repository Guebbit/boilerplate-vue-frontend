# src/infrastructure/composables/use-app-form.ts

## Purpose

App-level wrapper around the toolkit's `useStructureFormValidation` that binds the three open questions the toolkit deliberately leaves unanswered (i18n translation, notification dispatch, invalid-field CSS selector) to this application's fixed choices. Every form in the codebase calls this composable instead of re-supplying those three values individually.

## Key elements

- **`UseAppFormSettings`** — Optional settings interface with a single field, `formElement?: MaybeRefOrGetter<HTMLElement | undefined | null>`. When omitted, `revealErrors()` degrades to a pure state change (suitable for dialogs that already trap focus).
- **`useAppForm<T>(initialData, schema?, settings?)`** — The exported composable. Accepts initial form data, an optional Zod schema, and optional settings; returns everything `useStructureFormValidation` returns. Binds `useI18n().t` / `locale`, `useNotificationsStore().addMessage`, and `VUETIFY_INVALID_FIELD_SELECTOR` internally.

## Relationships

No graph neighbors are tracked. The file's direct imports are:

- `@guebbit/vue-toolkit` → `useStructureFormValidation`, `useNotificationsStore`
- `vue-i18n` → `useI18n`
- `@/infrastructure/utils/errors.ts` → `VUETIFY_INVALID_FIELD_SELECTOR`
- `vue` / `zod` → type imports only

## Notes

- The generic constraint is `Record<string, any>` (not `unknown`) because an interface lacks an index signature and would fail `Record<string, unknown>`; the `eslint-disable` comment in the source documents this.
- `revalidateOn: locale` is passed so that already-displayed error strings re-resolve when the language changes; without it, `formErrors` would hold stale resolved text.
- `showFormErrors` (from the toolkit return value) is the single source-of-truth gate for the template; the docblock explicitly warns against declaring a separate `ref(false)` beside it.
- A cross-cutting test at `tests/cross-cutting/form-idiom.spec.ts` enforces that new forms use this composable and do not re-implement the three bindings.
