---
source: src/app/utils/error-messages.ts
sha256: 0d6a4e39f42f3b323809ac693aef4d0fd4e09aa1db219584bb508a0670fc08d7
generated_at: 2026-10-02T11:49:48.027674+00:00
model: ollama:qwen3.8:27b
---

# src/app/utils/error-messages.ts

## Purpose

Whitelists which error-page messages are safe to display verbatim (as i18n dictionary keys) versus collapsing into a single generic key. Without this guard, free-form strings (a stale chunk URL, a raw `Error.message`, a fetch failure) would leak implementation details into the rendered page, the URL, and Umami's pageview tracking (FA74). Both `Error.vue` and the router's `onError` hook call the single predicate here, so they can never disagree on what counts as "known".

## Key elements

- **`GENERIC_ERROR_KEY`** (exported `const`, value `'error-page.unexpected'`) — the i18n key shown whenever a message fails the known-prefix check.
- **`isKnownErrorMessage`** (exported `const` arrow function) — returns `true` only if the message starts with one of the allowed dictionary prefixes.
- **`KNOWN_ERROR_MESSAGE_PREFIXES`** (module-private `const` array: `['error-page.', 'navigation.']`) — the set of i18n namespaces a message is allowed to name directly.

## Relationships

No dependency-graph neighbors are recorded for this file. It is consumed by `Error.vue` and `router/index.ts` (per the module doc comment), but neither appears in the neighbor list.

## Notes

- `KNOWN_ERROR_MESSAGE_PREFIXES` is intentionally **not** exported; adding a new allowed prefix means editing this file, not a consumer.
- The check is a simple `startsWith` against a short prefix list — it is not a full i18n-key validation, so a key like `'error-page.'` alone (no sub-key) would pass the predicate.
- The file's module doc comment explicitly calls out FA74 (analytics leakage) as the motivation; treat the prefix list as a security surface, not just a styling concern.
