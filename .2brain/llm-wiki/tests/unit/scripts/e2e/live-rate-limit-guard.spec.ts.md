---
source: tests/unit/scripts/e2e/live-rate-limit-guard.spec.ts
sha256: c7e8cdc62bba607b2661d116aede3e2870e631ef1cb88edae9d00c53252bc1f8
signature: c7e8cdc62bba607b2661d116aede3e2870e631ef1cb88edae9d00c53252bc1f8
generated_at: 2026-11-10T08:16:38.401961+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/live-rate-limit-guard.spec.ts

## Purpose

Unit tests for the `assertLiveRateLimitStore` guard that runs before any live E2E spec. The guard exists to fail fast when a live run is started without a valid Redis URL for the rate limiter, preventing a delayed, silent 429 on a card journey hours into the run. These tests pin down exactly when the guard throws and when it stays silent.

## Key elements

- **`describe('assertLiveRateLimitStore')`** — single test suite with four cases:
  - **Live + `undefined` URL** → must throw, and the error message must name `NODE_RATE_LIMIT_REDIS_URL`.
  - **Live + blank/whitespace URL** → same throw; guards against a value that looks set but is effectively empty.
  - **Live + valid Redis URL** (`redis://127.0.0.1:6379`) → must **not** throw.
  - **Non-live (demo) + `undefined` URL** → must **not** throw; the requirement is live-only.

## Relationships

- **`scripts/e2e/live-rate-limit-guard.ts`** — the sole import target. The spec calls `assertLiveRateLimitStore(isLive, redisUrl)` and asserts throw/no-throw behavior. The implementation of that function lives in the neighboring file.

## Notes

- The tests assert on the **error message content** (regex `/NODE_RATE_LIMIT_REDIS_URL/`), not just that an error is thrown. If the env-var name in the message changes, these tests break intentionally.
- The "demo profile" is represented by the boolean `false` as the first argument; there is no enum or string literal — the guard's contract is a simple two-argument function.
- Whitespace-only strings are treated the same as `undefined` (both reject). If the implementation changes to only check `null`/`undefined`, the second test will catch the regression.
