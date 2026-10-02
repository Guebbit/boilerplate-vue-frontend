---
source: src/infrastructure/http/antibot.ts
sha256: a34b8fb263bff05fe88bdeb21cf27070c023b49357aa70fef09d21f625460031
generated_at: 2026-10-02T11:54:41.531913+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/antibot.ts

## Purpose

Front-end utilities for the human-challenge (anti-bot) gate. Because the ESLint `no-restricted-imports` rule forbids `.vue` files from importing `@api` directly, this module re-exports the two `@api` calls (`getAntibotConfig`, `getAntibotChallenge`) that `HumanCheck.vue` needs, and provides helpers to attach a solved challenge token to outgoing requests and to detect the specific 401 that means "show the widget and retry."

## Key elements

- **`withAntibotToken(token, options?)`** – Merges the solved token into the request's `x-antibot-challenge-token` header. Returns the original `options` unchanged when `token` is `undefined` (provider is `none` or not yet solved). Shallow-copies `options` and spreads existing headers to avoid mutating the caller's object.
- **`isAntibotVerificationFailed(error)`** – Returns `true` when the first structured API error carries `ERROR_CODES.ANTIBOT_VERIFICATION_FAILED`; the signal to render `HumanCheck` inline and let the visitor retry the same submit.
- **`fetchAntibotConfig()`** – Thin re-export of `getAntibotConfig()` so `HumanCheck.vue` can obtain the active provider and widget config without importing `@api`.
- **`fetchAntibotChallenge()`** – Thin re-export of `getAntibotChallenge()`; meaningful only when the active provider is `altcha` (all others 404).
- **`ANTIBOT_TOKEN_HEADER`** (module-private) – The literal header name `'x-antibot-challenge-token'` read by the backend's `humanChallengeGate`.

## Relationships

- **`src/infrastructure/http/envelope.ts`** – Imports `getFirstApiError` to unwrap a rejected axios promise into a structured error object before comparing its `code`. This is the sole interaction with that file.
- **`@api` (generated client)** – Calls `getAntibotConfig` and `getAntibotChallenge`; also pulls `ERROR_CODES` from `@api/error-codes`.
- **Backend counterpart** – `src/infrastructure/http/middlewares/human-challenge.ts` is the server-side gate that reads the token header and issues the `ANTIBOT_VERIFICATION_FAILED` 401 this module detects.

## Notes

- The `@typescript-eslint/no-misused-spread` disable on the `headers` spread is intentional: AxiosHeaders' own enumerable entries are exactly what a plain object spread copies, and the generated `orvalMutator` merges headers the same way. Do not "fix" this.
- `withAntibotToken` returns `undefined` (not `{}`) when there is no token, preserving the caller's ability to omit the `AxiosRequestConfig` entirely.
- The module doc explicitly states no domain module owns "rung 3" (this anti-bot layer), which is why the functions live here rather than in a domain service.
