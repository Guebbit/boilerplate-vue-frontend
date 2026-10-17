---
source: tests/unit/infrastructure/observability/config.spec.ts
sha256: 4cf5abe3eb20ee13a92076ee5b1c95ec8a6f1915de85cc39a7d40b3eca077689
generated_at: 2026-10-17T02:38:07.569676+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/observability/config.spec.ts

## Purpose
Unit tests for the three env-reader functions (`readFaroConfig`, `readUmamiConfig`, `readUmamiRequireConsent`) and the `originToRegExp` helper exported from `@/infrastructure/observability/config`. The tests exist to pin down fallback defaults, blank/missing-value guards, the "both values required" rule for Umami, runtime-config override precedence, and the `ignoreUrls` logic that prevents Faro from instrumenting its own telemetry endpoints.

## Key elements
- **`TELEMETRY_VARIABLES`** — const array of every `VITE_*` env var the readers consult; blanked in `beforeEach` via `vi.stubEnv` so no test inherits the checkout's real `.env`.
- **`describe('originToRegExp')`** — asserts the regex is anchored at the start, escapes regex metacharacters (dot, `+`, `*`, `?`, brackets, braces, etc.) so a look-alike host does not match.
- **`describe('readUmamiConfig')`** — covers: undefined without a website id, blank-id treated as unset, both `src` and `websiteId` required, trimming of whitespace, and runtime `__APP_CONFIG.UMAMI_WEBSITE_ID` overriding the build-time env value.
- **`describe('readUmamiRequireConsent')`** — defaults to `true`; only the literal string `"false"` opts out; runtime `__APP_CONFIG.UMAMI_REQUIRE_CONSENT` wins.
- **`describe('readFaroConfig')`** — covers: undefined without `VITE_FARO_URL`, blank URL treated as unset, all-default fallback shape (`appName`, `appVersion` from `__APP_VERSION__`, `environment` from `import.meta.env.MODE`, empty `propagateTo`, `ignoreUrls` containing the collector URL as an exact string), explicit overrides, runtime-config precedence, collector URL excluded as an exact string, Umami origin excluded as a `RegExp`, no Umami exclusion when analytics is off, and graceful handling of a malformed `VITE_UMAMI_SRC`.

## Relationships
No graph neighbors recorded.

## Notes
- **CodeQL false positive.** The literal `'https://api.example.com'` in the `originToRegExp` tests will be flagged by CodeQL as `js/incomplete-hostname-regexp`. It is a false positive (the value is escaped before any `RegExp` is built). GitHub ignores inline `// codeql[ ]` suppression comments, so the alert must be dismissed in the repository's code-scanning UI.
- **`ignoreUrls` mixed types.** Faro compares the collector URL by exact string equality (no prefix match) but compares the Umami origin with a `RegExp` (because the beacon hits a *different* path under that origin, `/api/send`, not the script path). Tests assert this type distinction explicitly.
- **`__APP_CONFIG` cleanup.** `afterEach` deletes `globalThis.__APP_CONFIG` to prevent cross-test leakage of runtime overrides.
- **`__APP_VERSION__`** is a compile-time global (see `src/globals.d.ts`), not an env var; the test asserts it appears verbatim in the default config rather than being a hand-maintained string.
- **Malformed `VITE_UMAMI_SRC`** is tested with the string `'not-a-url'` to confirm the reader degrades gracefully (skips the Umami exclusion) instead of throwing from `new URL()`.
