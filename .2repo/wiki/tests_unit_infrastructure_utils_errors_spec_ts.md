# tests/unit/infrastructure/utils/errors.spec.ts

## Purpose

Unit tests for the error-handling utilities in `@/infrastructure/utils/errors.ts`. Validates that `notifyErrorMessages` extracts a human-readable string from a wide range of error shapes (and falls back safely when it can't), and that `VUETIFY_INVALID_FIELD_SELECTOR` correctly targets the first invalid field in Vuetify-shaped DOM markup.

## Key elements

- **`notifyErrorMessages` test suite** — verifies the function handles plain strings, `Error` instances, error-like objects, non-string values, empty strings, `null`, and non-string `message` properties; always calls the provided `addMessage` with either the extracted message or the translated `api-errors.unknown` fallback.
- **Observability reporting assertions** — confirms `captureException` receives the *original* error value (not the derived message), even on the fallback path.
- **`VUETIFY_INVALID_FIELD_SELECTOR` test suite** — renders Vuetify-shaped HTML and asserts the selector finds the first `.v-input--error` descendant input/textarea/select (or a `[tabindex]` fallback), ignores non-error fields, and returns `null` when nothing is in error.
- **`firstMatch` helper** — small DOM utility that injects an HTML string into a temporary `<form>`, runs `querySelector` with the selector under test, and cleans up.
- **`captureExceptionMock`** — a `vi.fn()` injected via `vi.mock` of the observability store, making the (otherwise no-op) `captureException` observable.

## Relationships

No graph neighbors are recorded for this file. It imports `notifyErrorMessages` and `VUETIFY_INVALID_FIELD_SELECTOR` from `@/infrastructure/utils/errors.ts`, `loadLocale` from `@/infrastructure/i18n`, and `enMessages` from `@/locales/en.json`, and mocks `@/infrastructure/observability/store.ts`.

## Notes

- `loadLocale('en')` in `beforeAll` is required: the fallback message is translated copy, so assertions compare against `enMessages['api-errors'].unknown` rather than a raw key.
- The observability store is mocked because the real `captureException` is a deliberate no-op (Faro not yet wired up); without the mock, reporting assertions would pass vacuously.
- Empty-message guards (`''`, `new Error('')`, `{ message: '' }`) each get a dedicated test case because the `&& error` / `&& error.message` truthiness checks are individually easy to drop in review.
- The selector tests encode the accessibility contract that the *first* invalid field is targeted, and that Vuetify-specific class names (`.v-input--error`) must remain stable — a Vuetify rename would break these without breaking the underlying focus logic (tested elsewhere in `useStructureFormValidation`).
