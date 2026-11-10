---
source: src/infrastructure/utils/use-missing-record.ts
sha256: 07ae29d3c7be0ff974fe6928b5948cbc37de7374c73eea11eaf493cd3dc5e75d
signature: e12c2d88662b1f9dfc3b25b2124ddb3a888c7c7a01d730c093fd0fc84aadfbc0
generated_at: 2026-11-10T03:15:12.751700+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-missing-record.ts

## Purpose

Provides the `onError` handler that record detail pages attach to their data-fetching `watch*` calls. When the API responds with 404 or 403, it redirects the user to the app's single Error page (replacing the history entry so Back doesn't return to a dead page). All other failures fall through to an ambient toast, preserving the existing error-display behavior.

## Key elements

- **`useMissingRecord()`** *(exported)* — Composable that returns a `(error: unknown) => void` handler. Inspects the rejected value via `absentIs`; on 404/403 it calls `router.replace` to the named `Error` route with a `status` param and a pre-set message key. On any other error it delegates to `notifyErrorMessages`.
- **`NOT_FOUND_MESSAGE`** — I18n key (`error-page.not-found`) passed as the Error page's `message` param for 404s.
- **`FORBIDDEN_MESSAGE`** — I18n key (`navigation.error-forbidden`) passed for 403s.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Not imported directly. Reached indirectly: when the error is neither 404 nor 403, the handler delegates to `notifyErrorMessages` (from `errors.ts`), which in turn reports through the shared logger.

## Notes

- Uses `router.replace` (not `router.push`) so the dead record page is removed from history.
- The `locale` param is read from `router.currentRoute.value.params` and forwarded to the Error route, so the Error page inherits the active locale.
- The returned handler is intended to be passed into a `watch*` `onError` slot *and* into a forced-refetch `.catch()`; it is not a one-shot callback.
- The `void` + `eslint-disable` before `router.replace` acknowledges that vue-router reports navigation failures asynchronously via its own `router.onError` hook (configured in `app/router/index.ts`) rather than through a returned promise.
