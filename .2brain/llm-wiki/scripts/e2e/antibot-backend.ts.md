---
source: scripts/e2e/antibot-backend.ts
sha256: 5cd92107e9c2f6005330bd6acdfd6403039344a0f8f3729a7d9ba8e8933947fc
signature: a58749ab5808b227998b48c98262714503e2b2f22dcdfdf59f462700121f2fcb
generated_at: 2026-11-10T02:30:47.798657+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/antibot-backend.ts

## Purpose

Centralizes the environment variables and CLI flag needed to boot the demo backend with its antibot (human-challenge) provider enabled. This lets the demo shard, the single-process `backend:demo --antibot` entry, and the live workflow's antibot matrix entry all boot an identical configuration from one source.

## Key elements

- **`ANTIBOT_BACKEND_ENV`** — A `Readonly<Record<string, string>` that sets `NODE_ANTIBOT_PROVIDER` to `altcha`, pins the PBKDF2 cost to `1000` (far below the 100 000 default, so a spec solves in milliseconds), supplies a throwaway `NODE_ANTIBOT_ALTCHA_SECRET`, and caps `NODE_AUTH_RATE_LIMIT_MAX` at `6` so the login check (engaged at half the budget) is reachable within a few wrong passwords.
- **`ANTIBOT_FLAG`** — The literal string `'--antibot'`, the CLI argument that triggers the antibot backend.
- **`wantsAntibotBackend(argv)`** — A one-liner predicate that checks whether the flag is present in the argument list.

## Relationships

- **`scripts/demo/run-backend.ts`** — Imports `ANTIBOT_FLAG` / `wantsAntibotBackend` to decide whether to merge `ANTIBOT_BACKEND_ENV` into the process environment before starting the demo backend.
- **`scripts/e2e/run-shards.ts`** — Imports `ANTIBOT_BACKEND_ENV` and passes it into the child-process env when spawning the demo shard for the e2e run.
- **`tests/unit/scripts/e2e/antibot-backend.spec.ts`** — Unit-tests the three exports (env shape/values, flag literal, predicate behavior).

## Notes

- The secret (`e2e-not-a-secret-altcha-key`) is intentionally non-secret; the backend runs on loopback in a throwaway demo. Do not treat it as a credential.
- `NODE_AUTH_RATE_LIMIT_MAX` is not an altcha variable — it belongs to the backend's auth layer. Other e2e backends set it much higher, so the live workflow overrides this value for those cases; only the antibot run relies on the low `6` here.
- The budget semantics: the login check activates once **half** the budget is consumed (i.e. after 3 failures), and the spec's `AC18` step leaves the account at that threshold.
