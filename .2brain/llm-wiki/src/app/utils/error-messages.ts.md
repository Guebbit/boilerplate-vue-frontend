---
source: src/app/utils/error-messages.ts
sha256: 1607e89a0dd0cd9d9e4ea7214945c0d3ca8f086764400ad838fa112337d49bbf
generated_at: 2026-10-17T00:07:14.648119+00:00
model: ollama:qwen3.8:27b
---

# src/app/utils/error-messages.ts

## Purpose

Defines a single predicate that distinguishes "known" error-page dictionary keys from arbitrary free-form strings (stale-chunk URLs, raw `Error.message` text, fetch-failure messages). This lets the UI and router show only vetted, translatable keys verbatim while collapsing everything else to one generic message, preventing implementation details from leaking into the rendered page, the URL, and Umami pageview events.

## Key elements

- **`GENERIC_ERROR_KEY`** (exported const) – The fallback i18n key (`'error-page.unexpected'`) displayed whenever an unrecognized message reaches the error page.
- **`isKnownErrorMessage(message: string): boolean`** (exported) – Returns `true` only when `message` starts with one of the allowed prefixes. This is the single source of truth for "is this safe to show."
- **`KNOWN_ERROR_MESSAGE_PREFIXES`** (module-private) – Array of permitted prefixes (`'error-page.'`, `'navigation.'`). Adding a new safe namespace means extending this array; no other code change is required.

## Relationships

The file has no dependency-graph neighbors, but its module doc comment names two consumers that call `isKnownErrorMessage` to decide whether to render `:message` directly or substitute `GENERIC_ERROR_KEY`:

- `Error.vue` – the error page component.
- `router/index.ts` – the `onError` handler that redirects to the error page.

Both are expected to route through this predicate so they never disagree about what counts as "known."

## Notes

- The check is **prefix-based** (`startsWith`), not exact-match. Any future key under `error-page.*` or `navigation.*` is automatically treated as known without updating the list.
- Because the predicate is the *only* gate, a typo in a route param (e.g. `error-pge.missing`) will silently fall through to the generic key rather than surfacing the typo—useful for safety, but it means a misspelled key produces no obvious error.
- The module intentionally exports a boolean function, not a resolved key. Callers pair it with `GENERIC_ERROR_KEY` to perform the fallback themselves.
