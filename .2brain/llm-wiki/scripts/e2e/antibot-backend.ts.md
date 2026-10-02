---
source: scripts/e2e/antibot-backend.ts
sha256: 018e364b1880b99d0d991dc9c6afd1e0b8ecafc820742e383452e08d1a5de780
generated_at: 2026-10-02T11:33:09.476177+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/antibot-backend.ts

## Purpose

Shared configuration module that defines how the demo backend is booted with the altcha antibot provider enabled. It exists so that every entry point (shard runner, single-process backend, CI workflow) boots an identical antibot-enabled backend from one source of truth.

## Key elements

- **`ANTIBOT_BACKEND_ENV`** – `Readonly<Record<string, string>>` with the three `NODE_ANTIBOT_*` variables: provider set to `altcha`, a fixed (non-sensitive) secret, and a PBKDF2 cost of `1000` (far below the 100 000 default) to keep test solves in milliseconds.
- **`ANTIBOT_FLAG`** – The CLI flag string `'--antibot'` that `run-backend.ts` looks for.
- **`wantsAntibotBackend(argv)`** – Small helper that returns `true` when `ANTIBOT_FLAG` appears in the argument list.

## Relationships

- **`scripts/demo/run-backend.ts`** – Imports `ANTIBOT_FLAG` / `wantsAntibotBackend` to decide whether to merge `ANTIBOT_BACKEND_ENV` into the process env before boot.
- **`scripts/e2e/run-shards.ts`** – Consumes `ANTIBOT_BACKEND_ENV` when launching the demo shard in antibot mode.
- **`github/workflows/e2e-live.yml`** – The live workflow's antibot matrix entry relies on the same env/flag contract defined here.
- **`tests/unit/scripts/e2e/antibot-backend.spec.ts`** – Unit-tests the exports of this file (flag constant, argv check, env shape).

## Notes

- The altcha secret (`e2e-not-a-secret-altcha-key`) is intentionally a throwaway value; the backend runs on loopback for demo/testing only. Do not treat it as a real credential.
- Cost `1000` is chosen specifically so e2e specs solve the challenge in milliseconds; raising it will slow every antibot test.
- The env keys follow the `NODE_ANTIBOT_*` naming convention documented under "Anti-automation — rung 4" in `.env-example`.
