---
source: src/infrastructure/observability/config.ts
sha256: 30cd94d0ae70b6531b137c8c25292f6b613bc52ae09168476484c8696ab7f857
generated_at: 2026-10-02T14:40:10.298479+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/observability/config.ts

## Purpose

Pure environment-variable readers for the two telemetry back-ends (Grafana Faro and Umami analytics). Each reader returns `undefined` when its primary variable is unset, serving as the single opt-in switch the store checks — no configuration, no telemetry code runs at runtime.

## Key elements

- **`FaroConfig`** — interface for the Grafana Faro SDK init payload (url, appName, appVersion, environment, apiOrigin, ignoreUrls).
- **`UmamiConfig`** — interface for the Umami tracker injection (src URL, websiteId).
- **`readFaroConfig(): FaroConfig | undefined`** — reads `VITE_FARO_*` vars (via `runtimeValue` then `import.meta.env`). Returns `undefined` if `FARO_URL` is blank. Fills optional fields with defaults (`'frontend'`, `__APP_VERSION__`, build mode, `http://localhost:3000`). Sets `ignoreUrls` to exclude its own collector endpoint and the Umami origin.
- **`readUmamiConfig(): UmamiConfig | undefined`** — reads `VITE_UMAMI_*` vars. Returns `undefined` if `UMAMI_WEBSITE_ID` is blank (analytics fully disabled). `src` defaults to the local Umami dev server.
- **`readUmamiRequireConsent(): boolean`** — reads `UMAMI_REQUIRE_CONSENT`. Opt-out: defaults to `true`; only an explicit string `"false"` disables the consent gate.
- **`originToRegExp(origin: string): RegExp`** — escapes regex metacharacters in an origin string and returns a start-anchored pattern (`^…`).
- **`umamiOriginPattern(): RegExp[]`** (private) — extracts the origin from the configured Umami `src` via a non-throwing regex match; returns `[]` when analytics is off or the origin is unrecognisable.

## Relationships

- **`@/infrastructure/runtime-config`** (`runtimeValue`) — sole import. All readers check `runtimeValue(key)` first, falling back to `import.meta.env.VITE_{key}`, giving runtime overrides priority over build-time values.
- **`store.ts`** (caller, per module doc-comment) — consumes the `undefined` return values as the on/off switch for initialising Faro / injecting the Umami script.

## Notes

- **`ignoreUrls` semantics differ by type:** a `string` entry is compared for *exact* equality with the request URL (not a prefix). Anything covering multiple paths must be a `RegExp`. This is why the Umami origin uses `originToRegExp` while the Faro collector URL is a plain string.
- **Consent is opt-out.** `readUmamiRequireConsent` returns `true` for any value other than the literal string `"false"`, including empty/unset. This mirrors the backend's `NODE_ANALYTICS_REQUIRE_CONSENT`.
- **`umamiOriginPattern` deliberately avoids `new URL()`** to prevent a malformed `VITE_UMAMI_SRC` from throwing and taking Faro initialisation down with it.
- **`__APP_VERSION__`** is a Vite `define` global, not an import — it's replaced at build time.
- **API origin for trace stitching** reuses `VITE_API_URL` / `runtimeValue('API_URL')`, so FE→BE W3C `traceparent` propagation piggybacks on the existing API endpoint config rather than introducing a separate variable.
