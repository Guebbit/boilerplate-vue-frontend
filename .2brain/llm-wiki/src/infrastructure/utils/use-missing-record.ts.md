---
source: src/infrastructure/utils/use-missing-record.ts
sha256: 25c564c26498a384be41b9fcae463986f97ba00d0ab47faa7942ff1ec6e0faa8
generated_at: 2026-10-02T14:42:36.239863+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-missing-record.ts

## Purpose

Provides the error handler a record detail page uses when the API responds with 404 or 403. Instead of the page sitting on loading placeholders indefinitely, it redirects the visitor to the shell's single Error page. Any other rejection falls through to an ambient toast, preserving the existing non-record error behavior.

## Key elements

- **`NOT_FOUND_MESSAGE`** / **`FORBIDDEN_MESSAGE`** — i18n key constants (`error-page.not-found`, `navigation.error-forbidden`) that map to the Error page's display text. Only keys whitelisted in `src/app/utils/error-messages.ts` may be used here.
- **`useMissingRecord()`** (exported) — Vue composable that returns a `(error: unknown) => void` handler. The handler:
  1. Checks the rejected value against 404 and 403 via `absentIs`.
  2. If matched, calls `router.replace` to the named `Error` route, forwarding the current `locale` param and the appropriate message key.
  3. If not matched, delegates to `notifyErrorMessages` (toast + report).

## Relationships

- **`src/modules/demo/tests/guards.spec.ts`** — Tests that exercise the 404/403 redirect and the fallback toast path of `useMissingRecord`.
- **`src/infrastructure/utils/logger.ts`** — Not directly imported; reached indirectly through `errors.ts` (`notifyErrorMessages`) for the non-404/403 reporting path.
- **`src/infrastructure/utils/errors.ts`** (imported, not listed as a neighbor above) — Supplies `absentIs` (status-code matcher) and `notifyErrorMessages` (toast/report helper).

## Notes

- Uses `router.replace` rather than `router.push`, so the Back button does not land the user back on the now-dead record page.
- The `locale` route param is read from the *current* route and re-supplied to the Error route; omit it and the Error page loses its locale context.
- The returned handler is intended to be passed as the `onError` option of a `watch*` reactive fetch **or** attached as `.catch()` on a manual refetch promise — not called directly.
