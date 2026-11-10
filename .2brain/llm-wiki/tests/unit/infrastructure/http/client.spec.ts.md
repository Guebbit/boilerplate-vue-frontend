---
source: tests/unit/infrastructure/http/client.spec.ts
sha256: 952a78a48aa154b36748fe58c7e73d42c362eb403476bd6665bb0582cabc33ee
signature: 80787c6e6bf1c594b33eaf762fe3170965f97a385657c36a60671afd4e5295b0
generated_at: 2026-11-10T07:55:36.547094+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/client.spec.ts

## Purpose

Vitest spec that verifies the shared axios instance (`src/infrastructure/http/client.ts`) is configured correctly at import time: base URL, timeout, credential handling, and the precedence of runtime `__APP_CONFIG` over build-time `VITE_*` environment variables. It exists to catch the silent failure mode where a missing env var causes relative calls to hit the dev server or a hung request to hang indefinitely.

## Key elements

- **`loadClient(environment)`** — Helper that calls `vi.resetModules()`, stubs the given env vars (or explicitly unsets them when the value is `undefined`), then performs a fresh dynamic `import('@/infrastructure/http/client.ts')` so module-scope env reads re-execute. Returns the module promise.
- **`afterEach`** — Deletes the `__APP_CONFIG` global so the runtime-override test doesn't leak into other tests.
- **"takes the base URL and timeout from the environment"** — Asserts `instance.defaults.baseURL` and `.timeout` match the stubbed `VITE_API_URL` / `VITE_AXIOS_TIMEOUT`.
- **"falls back to same-origin relative calls and a ten second timeout"** — With both vars unset, asserts `baseURL` is `''` (not `undefined`) and `timeout` is `10_000`.
- **"sends credentials, so the httpOnly refresh cookie travels with every call"** — Asserts `instance.defaults.withCredentials === true`.
- **"a runtime-configured API_URL and timeout win over the build-time VITE_* values"** — Sets `globalThis.__APP_CONFIG` before import and verifies those values override the env vars.

## Relationships

- **`tests/cross-cutting/module-map.spec.ts`** — The module-map spec catalogues test files by path; this file is expected to appear as a unit-test entry for the `infrastructure/http` module. No code is shared.
- **`scripts/lighthouse/evaluate.ts`** — No direct import or code-level interaction found in this file. Listed as a graph neighbor, likely because both touch the HTTP layer or app-config plumbing indirectly.

## Notes

- Tests use **dynamic `import()`** rather than a static top-level import specifically so each case re-executes the module-scope `process.env` reads after `vi.resetModules()`. A static import would share one cached instance across all cases.
- The fallback assertion checks for the empty string `''`, not `undefined`, because axios treats `undefined` as "no prefix" by accident (it happens to work) whereas `''` is an explicit decision to make relative calls same-origin.
- The `VITE_AXIOS_TIMEOUT` value is passed as a **string** in the env stub (matching how Vite injects env vars), and the test asserts it arrives as a **number** (`2500`) in `instance.defaults.timeout` — the client module is responsible for the conversion.
