---
source: tests/unit/scripts/lighthouse/audit-environment.spec.ts
sha256: a6b9354bcfe6df9099db77701490a435c30ac1910383cfad5a7cb2e6b074f2b6
signature: a6b9354bcfe6df9099db77701490a435c30ac1910383cfad5a7cb2e6b074f2b6
generated_at: 2026-11-10T08:21:01.422531+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/lighthouse/audit-environment.spec.ts

## Purpose

Unit tests that guarantee the Lighthouse audit build runs entirely in a loopback environment: every baked URL resolves to `localhost` or `127.0.0.1`, analytics endpoints target the sink container's port, and the container's own generator scripts are discovered in the expected order.

## Key elements

- **`describe('auditEnvironment')`** — Two tests:
  - *"points every URL at this machine"* — Calls `auditEnvironment(3190)`, filters keys matching `/URL$|SRC$/`, asserts all hostnames are `localhost` or `127.0.0.1`.
  - *"sends analytics to the sink port"* — Asserts `VITE_FARO_URL` and `VITE_UMAMI_SRC` specifically hit `127.0.0.1:3190`.
- **`describe('generatorScripts')`** — One test:
  - *"finds the runtime-config and security.txt generators, in order"* — Calls `generatorScripts('docker/docker-entrypoint.d')`, extracts basenames, and asserts the first two entries are `40-generate-runtime-config.sh` and `41-generate-security-txt.sh`.

## Relationships

- **`scripts/lighthouse/audit-environment.ts`** — The module under test. This spec imports `auditEnvironment` (accepts a port number, returns an env-object of baked URLs) and `generatorScripts` (accepts a directory path, returns an ordered list of script file paths).

## Notes

- The test uses a hard-coded port `3190` as the "sink" port; the assertions are tied to that specific value.
- `generatorScripts` is tested with the literal path `docker/docker-entrypoint.d`, so the test assumes that directory (and its numbered scripts) exists in the repo at that relative location.
- URL detection relies on a regex filter (`/URL$|SRC$/`) over the returned object's keys — if `auditEnvironment` adds a new URL-bearing key that doesn't match that suffix, it will silently escape the localhost assertion.
