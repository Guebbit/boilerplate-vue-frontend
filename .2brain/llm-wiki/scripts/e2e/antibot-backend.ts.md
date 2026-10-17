---
source: scripts/e2e/antibot-backend.ts
sha256: 8c07c0e842838c630c8d1fdb06e0c55462c88786e8a9cff121cf1d66dfb120b6
generated_at: 2026-10-16T23:59:59.704940+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/antibot-backend.ts

## Purpose

Defines the shared configuration for booting the demo backend with its antibot (human-challenge) provider enabled. The provider is self-hosted `altcha` (proof-of-work), so no external vendor or network is needed. A single env record and a CLI flag keep the three entry points that need this backend in sync.

## Key elements

- **`ANTIBOT_BACKEND_ENV`** — `Readonly<Record<string, string>>` of four `NODE_*` variables: sets `altcha` as the provider, pins a fixed throwaway secret, lowers PBKDF2 cost to 1000 (fast solves), and caps `NODE_AUTH_RATE_LIMIT_MAX` at 6 so the login check engages after the third wrong password.
- **`ANTIBOT_FLAG`** — the string `'--antibot'`; the CLI argument that triggers the antibot backend.
- **`wantsAntibotBackend(argv)`** — returns `true` if `ANTIBOT_FLAG` appears in the given argument array.

## Relationships

- **`scripts/e2e/run-shards.ts`** — imports `ANTIBOT_BACKEND_ENV` to boot the demo shard with the antibot provider active.
- **`scripts/demo/run-backend.ts`** — imports `ANTIBOT_FLAG` and `wantsAntibotBackend` so `backend:demo --antibot` applies the env.
- **`github/workflows/e2e-live.yml`** — the live workflow's antibot matrix entry applies the same env values (or falls back to its own rate-limit for other scenarios).
- **`tests/unit/scripts/e2e/antibot-backend.spec.ts`** — unit-tests the exports of this file.

## Notes

- The altcha secret is intentionally a throwaway string; the backend runs on loopback only and guards nothing.
- `NODE_AUTH_RATE_LIMIT_MAX: '6'` is not an altcha variable — it controls the backend's per-account login budget. The check engages at half (3 failed attempts), which is how a test journey trips it. Other e2e runs raise this limit far higher so the login check stays dormant.
- Cost is 1000 iterations (vs. the 100 000 default) specifically so a test spec can solve the challenge in milliseconds.
