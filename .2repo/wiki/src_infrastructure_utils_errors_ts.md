# src/infrastructure/utils/errors.ts

## Purpose

Central module for error-handling utilities shared across the app. It binds the app's translated fallback wording to the toolkit's message extractor, classifies rejections into "no response" vs. "server answered with a specific status," provides the toast+Faro reporting pair called from catch blocks, and exports a Vuetify-specific CSS selector for locating invalid form fields.

## Key elements

- **`getErrorMessage(error: unknown): string`** (internal) — Wraps `extractErrorMessage` from `@guebbit/js-toolkit` with the app's translated `"api-errors.unknown"` fallback so an empty rejection still yields readable copy.
- **`isTransportFailure(error: unknown): boolean`** (exported) — Returns `true` when the rejected value carries no numeric `status` property (connection dropped, DNS failure, request never sent).
- **`absentIs(error: unknown, ...statuses: number[]): boolean`** (exported) — Returns `true` when the rejection *does* carry a status and it matches one of the provided "absence" codes (e.g. 404 = no intent, 401 = no cart). Used by callers to distinguish "nothing there" from a genuine error.
- **`notifyErrorMessages(addMessage, error)`** (exported) — Calls `addMessage` with `getErrorMessage(error)` for the user-facing toast, then unconditionally forwards the original error to `useObservabilityStore().captureException` (Faro) with stack.
- **`VUETIFY_INVALID_FIELD_SELECTOR`** (exported constant) — CSS selector targeting the *focusable* control inside a `.v-input--error` wrapper (input, textarea, select, or `[tabindex]` for `v-select`). Passed as `invalidFieldSelector` by every form's `revealErrors()` call.

## Relationships

- **`@guebbit/js-toolkit`** — Source of `extractErrorMessage`; this file supplies the language-aware fallback string the toolkit leaves blank.
- **`@/infrastructure/observability/store.ts`** — `useObservabilityStore` provides `captureException`, the Faro sink used by `notifyErrorMessages`.
- **`@/infrastructure/i18n`** — `translate` resolves the fallback key (`api-errors.unknown`) at call time.
- **`onResponseReject`** (referenced in docs, not imported) — Produces the `{ status }` envelope that `isTransportFailure` and `absentIs` classify.
- **`useStructureFormValidation`** (referenced in docs) — Consumes `VUETIFY_INVALID_FIELD_SELECTOR` to focus the first invalid field after a failed submit.

## Notes

- The analytics rationale: the app and the API both write to the same Umami website, so only *transport* failures (no HTTP status) are reported here; server-answered errors are already recorded server-side. Reporting both would produce indistinguishable duplicate rows.
- `absentIs` is intentionally variadic — callers pass only the statuses they treat as "absence" for that particular endpoint, keeping the rest as hard failures.
- `VUETIFY_INVALID_FIELD_SELECTOR` exists because Vuetify puts the `--error` class on the wrapper, not the native control; the trailing `[tabindex]` clause is needed for `v-select`, which renders no `<input>/<select>` of its own.
- `getErrorMessage` is **not** exported; it is the private helper behind `notifyErrorMessages`. Callers that need a message string should go through the public pair.
