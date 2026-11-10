---
source: src/app/utils/error-messages.ts
sha256: 1607e89a0dd0cd9d9e4ea7214945c0d3ca8f086764400ad838fa112337d49bbf
signature: 6f425ab7eeee1bac022abfcbd5bdfa1a02eca261485b7d2e1e4ad798e45b07d3
generated_at: 2026-11-10T02:58:13.125568+00:00
model: ollama:qwen3.8:27b
---

# src/app/utils/error-messages.ts

## Purpose

Provides a single predicate that decides whether a router error message is a known, translatable dictionary key safe to display verbatim, or whether it should be replaced with a generic fallback. This prevents free-form strings (stale-chunk URLs, raw `Error.message` values) from leaking into the page body, the URL, and Umami pageview data. Both `Error.vue` and the router's `onError` hook rely on this one check so they never disagree.

## Key elements

- **`KNOWN_ERROR_MESSAGE_PREFIXES`** (module-private) — Array of dictionary prefixes (`'error-page.'`, `'navigation.'`) that mark a message as safe to show directly.
- **`GENERIC_ERROR_KEY`** (exported) — The fallback i18n key (`'error-page.unexpected'`) substituted whenever a message fails the known-prefix check.
- **`isKnownErrorMessage(message: string): boolean`** (exported) — Returns `true` only when `message` starts with one of the known prefixes; otherwise the message is not recognised (thrown messages, fetch failure text, stale-chunk URLs, or an empty string).

## Relationships

The dependency graph lists no neighbors for this module. The module doc comment names two intended consumers — `Error.vue` and the `onError` handler in `router/index.ts` — but neither appears in the graph as a linked file.

## Notes

- The check is a **prefix** match, not an exact-key lookup. Any string beginning with `error-page.` or `navigation.` passes, even if the specific sub-key does not exist in the dictionary. Downstream i18n resolution will still fall back, but the predicate itself does not validate key existence.
- The file intentionally exports **no** function that *returns* the display string; it only classifies. The caller chooses whether to render the raw message or `GENERIC_ERROR_KEY`.
- Adding a new safe prefix requires updating `KNOWN_ERROR_MESSAGE_PREFIXES` here and adding the corresponding entries to the locale dictionaries; there is no runtime registration.
