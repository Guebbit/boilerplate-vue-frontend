---
source: src/infrastructure/http/antibot.ts
sha256: 2d8e6f776886de1668591b8c4e2b331ee09cc5d3130a9a230b2435e989d157b0
signature: 643c72cb412f261a35420a2af8b3fe795b40f2bd81be310d0f538489fd1d597a
generated_at: 2026-11-10T03:02:33.674636+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/antibot.ts

## Purpose

Front-end glue for the backend's `humanChallengeGate` (ALTCHA anti-bot flow). It exists because no domain module owns this "rung 3" concern, and `no-restricted-imports` forbids `.vue` components from importing `@api` directly—so the two calls `HumanCheck.vue` needs live here.

## Key elements

- **`ANTIBOT_TOKEN_HEADER`** — the literal header name (`antibot-challenge-token`) the backend middleware reads on every gated request.
- **`withAntibotToken(token, options?)`** — shallow-copies an axios config and injects the solved token into `headers`; returns the original options unchanged when `token` is `undefined`.
- **`isAntibotVerificationFailed(error)`** — type-guard that checks whether the first structured error's code is `ERROR_CODES.ANTIBOT_VERIFICATION_FAILED`; the signal to render `HumanCheck` inline and let the visitor retry the same submit.
- **`fetchAntibotConfig()`** — loads the public config and returns its `antibot` member (provider name, widget settings); throws if the config is unreadable.
- **`fetchAntibotChallenge()`** — wraps `getAntibotChallenge()` to fetch a fresh ALTCHA challenge; only meaningful when the active provider is `altcha` (all others 404).

## Relationships

- **`src/infrastructure/http/envelope.ts`** — imports `getFirstApiError` to extract the first structured error from an unknown rejection value, which `isAntibotVerificationFailed` then compares against the error-code constant.

## Notes

- The header-spread in `withAntibotToken` carries an `eslint-disable` for `@typescript-eslint/no-misused-spread`: AxiosHeaders' enumerable entries are intentionally copied via object spread, mirroring how `orvalMutator` merges headers.
- `fetchAntibotChallenge` is a thin re-export of `@api`'s `getAntibotChallenge`; callers should check `fetchAntibotConfig` first to confirm the `altcha` provider is active before invoking it.
- The paired backend middleware lives at `src/infrastructure/http/middlewares/human-challenge.ts`.
