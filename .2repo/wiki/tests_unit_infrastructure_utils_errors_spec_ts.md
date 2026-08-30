# tests/unit/infrastructure/utils/errors.spec.ts

## Purpose

Unit tests (Vitest) for the `notifyErrorMessages` helper and the `VUETIFY_INVALID_FIELD_SELECTOR` constant exported by `@/infrastructure/utils/errors.ts`. Covers message-extraction across input shapes, fallback behaviour, telemetry forwarding, and the CSS selector's matching against Vuetify markup.

## Key elements

- **`notifyErrorMessages` suite** — asserts the function calls `addMessage` with the correct string for: plain strings, `Error` instances, error-like objects (`{ message }`), and a translated fallback for unrecognised / empty / non-string / `null` inputs. Also verifies the original value (not the derived string) is forwarded to `captureException`.
- **`VUETIFY_INVALID_FIELD_SELECTOR` suite** — asserts the selector matches the first invalid Vuetify field (`input`, `textarea`, `select`, or a `[tabindex]` fallback for `v-select`-style wrappers) and returns `null` when nothing is in error.
- **`firstMatch` helper** — injects raw HTML into a temporary `<form>`, queries with the selector, and removes the node.
- **`vi.mock('@/infrastructure/stores/observability.ts')`** — replaces the real store with a `captureExceptionMock` so telemetry assertions are meaningful (the real implementation is a no-op until Faro is wired up).
- **`beforeAll(() => loadLocale('en'))`** — loads the English dictionary so fallback assertions compare against actual copy rather than a raw i18n key.

## Relationships

No graph neighbors are registered for this file.

## Notes

- **Locale must be loaded before assertions.** The fallback message is translated copy; without `loadLocale` every fallback assertion would compare against a raw key like `api-errors.unknown` and silently pass or fail incorrectly.
- **Observability mock is intentional.** The production `captureException` is a deliberate no-op pending Faro integration. Without the mock, "reports the error" assertions would pass vacuously (the mock would never be called, but the real store would also never fail).
- **Empty-message guards are tested per shape.** Each falsy shape (`''`, `new Error('')`, `{ message: '' }`, `{ message: {…} }`, `null`) gets its own test because the corresponding `&&` guard is a single, review-invisible token; dropping any one would be caught only by its dedicated case.
- **`null` is a realistic input.** An empty rejected API body deserialises to `null`; `typeof null === 'object'` means the `error &&` guard is the only thing preventing a `TypeError`.
