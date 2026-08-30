# src/infrastructure/utils/errors.ts

## Purpose

Centralised error-handling helpers shared across the app: translating a caught value into user-facing text, classifying API rejections as transport-level vs. answered failures, the toast+Faro reporting pair every `catch` block calls, and a Vuetify-specific CSS selector for post-submit focus. It exists so that tone/language decisions, analytics-policy decisions, and a Vuetify quirk are each written in one place rather than scattered through feature code.

## Key elements

- **`getErrorMessage`** (internal) — Wraps the toolkit's `extractErrorMessage` with `translate('api-errors.unknown')` as the fallback string when the rejection carries nothing readable.
- **`isTransportFailure`** (exported) — Returns `true` when the rejected value has no numeric `status` property, meaning the server never replied (network drop, unreachable host, etc.).
- **`absentIs`** (exported) — Returns `true` when the rejection carries one of the caller-supplied HTTP statuses (e.g. 404, 401), i.e. the server *did* answer and the answer means "resource absent."
- **`notifyErrorMessages`** (exported) — Two-step catch-block helper: calls the provided `addMessage` sink with `getErrorMessage(error)`, then forwards the raw error to `useObservabilityStore().captureException` (Faro).
- **`VUETIFY_INVALID_FIELD_SELECTOR`** (exported constant) — CSS selector targeting the focusable element *inside* a `.v-input--error` wrapper (native `input`/`textarea`/`select` or any `[tabindex]` child). Passed as `invalidFieldSelector` to `useStructureFormValidation`.

## Relationships

No graph-tracked neighbors were recorded. The file imports three external modules:

- `@guebbit/js-toolkit` → `extractErrorMessage` (the toolkit's message extractor that `getErrorMessage` wraps).
- `@/infrastructure/stores/observability.ts` → `useObservabilityStore` (Faro capture sink used by `notifyErrorMessages`).
- `@/infrastructure/i18n` → `translate` (provides the fallback string and any localised wording).

Feature code imports `isTransportFailure`, `absentIs`, `notifyErrorMessages`, and `VUETIFY_INVALID_FIELD_SELECTOR` from this module.

## Notes

- `getErrorMessage` is intentionally **not** exported; callers should use `notifyErrorMessages` or call `translate` themselves if they need only the string.
- The transport-vs-answered split is tied to a shared Umami analytics site: only transport failures are reported here because the server-side repo already records answered failures. Reporting both would produce duplicate rows.
- `absentIs` is a *negation helper*: it tells the caller the 404/401 means "nothing to render," not "an error to toast." Any status outside the supplied list is a genuine failure.
- `VUETIFY_INVALID_FIELD_SELECTOR` differs from the toolkit's default `[aria-invalid="true"]` because Vuetify puts the error class on the wrapper, not the focusable control; the trailing `[tabindex]` clause catches `v-select` and similar non-native inputs.
- All error-accepting parameters are typed `unknown` by design — the helpers must survive `catch` blocks where the thrown value may be a string, `null`, a thrown object, or anything else.
