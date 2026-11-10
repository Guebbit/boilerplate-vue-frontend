---
source: tests/unit/infrastructure/observability/config.spec.ts
sha256: 26be57d06e96e3427808901bb381a77d5afc30d95ffbcb09f6a37f8a86e051a3
signature: 676be77839dd18cc5c906ac377fe06cfd96a5c6802b9c9e751c1bb1cf8004c34
generated_at: 2026-11-10T08:02:07.638517+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/observability/config.spec.ts

## Purpose

Unit tests for the four observability helpers exported by `src/infrastructure/observability/config.ts` (`originToRegExp`, `readUmamiConfig`, `readUmamiRequireConsent`, `readFaroConfig`). Because every reader is a pure function of the environment, the suite's only test seam is stubbing `VITE_*` variables per case; these tests pin down fallback defaults, the two opt-out branches (Faro off without a collector URL, Umami off without a website ID), and the runtime-`__APP_CONFIG` override path.

## Key elements

- **`TELEMETRY_VARIABLES`** – Frozen list of all eight `VITE_*` env vars the readers inspect; blanked in `beforeEach` so no test inherits another's (or the checkout's real `.env`'s) values.
- **`afterEach` cleanup** – Deletes `globalThis.__APP_CONFIG` so runtime-override tests cannot leak into the next case.
- **`describe('originToRegExp')`** – Verifies start-of-string anchoring, dot/metadata escaping, and literal treatment of all common regex metacharacters via `it.each`.
- **`describe('readUmamiConfig')`** – Covers: undefined without a website ID, blank-ID-as-unset, both-values-trimmed, and runtime `__APP_CONFIG.UMAMI_WEBSITE_ID` winning over the build-time env.
- **`describe('readUmamiRequireConsent')`** – Defaults to `true`; only the literal string `"false"` opts out (`"0"` still yields `true`); runtime config override.
- **`describe('readFaroConfig')`** – Covers: undefined without a URL, full default object shape (including `ignoreUrls` containing the collector URL as an exact string and the Umami origin as a `RegExp`), explicit-value overrides, runtime override, `ignoreUrls` semantics (Faro exact-match vs. Umami prefix-match), graceful handling of a malformed `VITE_UMAMI_SRC`, and exclusion suppression when Umami is disabled.

## Relationships

No dependency-graph neighbors are recorded for this file. It imports solely from `@/infrastructure/observability/config` (the module under test) and from `vitest`.

## Notes

- **CodeQL false positive.** The literal `'https://api.example.com'` passed to `originToRegExp` is *not* a regex; the function escapes metacharacters before building the `RegExp`. CodeQL's `js/incomplete-hostname-regexp` will flag it, but GitHub does not honour inline `// eslint-disable` / suppression comments for this rule — the alert must be dismissed in the repo's code-scanning tab.
- **`ignoreUrls` asymmetry.** Faro compares the collector URL for exact string equality, while the Umami entry is a `RegExp` (origin prefix). This is intentional: Umami's beacon hits `/api/send` under the origin, not the script URL, so excluding only the script path would miss real traffic.
- **`appVersion` default** is the build-time `__APP_VERSION__` global (declared in `src/globals.d.ts`), not a hard-coded string.
- **`propagateTo` default** is an empty array because a same-origin API needs no explicit OTel propagation target.
