---
source: tests/unit/infrastructure/http/antibot.spec.ts
sha256: 167beb4a2a487e88f30fd4ecd169d2e16be148f98daf68f1f04c9e6aaa625e2a
signature: 47fb4ea0f7a595a842959a2437a993ce32b7576cfb3d4f93ed648da62fa1fd46
generated_at: 2026-11-10T07:55:23.973969+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/antibot.spec.ts

## Purpose

Unit tests for the four antibot helpers exported by `@/infrastructure/http/antibot.ts`: `withAntibotToken` (the header merge every gated form's submit passes through), `isAntibotVerificationFailed` (the retry signal read off a 401 by login/payment), and the two thin `@api` re-exports (`fetchAntibotConfig`, `fetchAntibotChallenge`). Because `human-check.spec.ts` mocks both re-exports away to isolate `HumanCheck.vue`'s branching, this file is the sole test proving they delegate to the correct generated call.

## Key elements

- **`describe('withAntibotToken')`** — verifies the function returns options unchanged when no token is present, attaches `antibot-challenge-token` to a new or existing `headers` object, and preserves non-header options (e.g. `onUploadProgress`) alongside the injected header.
- **`describe('isAntibotVerificationFailed')`** — asserts the predicate is `true` only for the exact `ANTIBOT_VERIFICATION_FAILED` error code and `false` for other codes, `undefined`, or a bare `Error`.
- **`describe('fetchAntibotConfig')`** — mocks `loadConfig` and confirms the helper returns the `antibot` member of the public config, or rejects when the config is unreadable.
- **`describe('fetchAntibotChallenge')`** — mocks `getAntibotChallenge` from `@api` and confirms delegation.
- **Module-level mocks** — `vi.mock('@api')` and `vi.mock('@/infrastructure/config.ts')` stub out the two external dependencies for the re-export tests.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- `human-check.spec.ts` mocks `fetchAntibotConfig` and `fetchAntibotChallenge` away entirely; this spec is the **only** place that verifies they actually call the right underlying function. Removing or skipping it silently loses that guarantee.
- The `onUploadProgress` constant is a no-op stand-in; it exists solely to assert that non-header option fields survive the merge unchanged.
