---
source: scripts/e2e/live-rate-limit-guard.ts
sha256: 1cd96da749b089794c5c5488f5605ec1231d52423640ea2a75479112eacd2750
signature: d57f8220f29742f1ab34490d7b35f0972f3207947742a58cc2db08e37a73d731
generated_at: 2026-11-10T02:33:11.564639+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/live-rate-limit-guard.ts

## Purpose

A pre-flight guard that refuses to start a live-profile Cypress run when the rate-limiter's Redis URL is missing. Without that URL the backend keeps rate-limit counters in-process, so the inter-spec reseed (`LIVE_RESET_COMMAND` via `cy.exec`) cannot clear them; card-payment journeys then hit 429 and time out silently. This file converts that hours-long failure into an immediate, descriptive error at the top of the run.

## Key elements

- **`assertLiveRateLimitStore(liveProfile: boolean, redisUrl?: string): void`** — The sole export. No-ops when `liveProfile` is false or when `redisUrl` is a non-empty string. Otherwise throws an `Error` naming the missing env var and pointing to `docs/tools/live-e2e.md` (step 3) for the fix.

## Relationships

- **cypress.config.ts** — The caller: it invokes `assertLiveRateLimitStore` with the parsed `CYPRESS_liveProfile` flag and the current process's `NODE_RATE_LIMIT_REDIS_URL` value before any spec loads, so the check runs once at startup rather than per-test.
- **tests/unit/scripts/e2e/live-rate-limit-guard.spec.ts** — Unit specs that exercise the three branches (demo profile → no throw; live + URL present → no throw; live + URL absent/whitespace → throws with the expected message).

## Notes

- The check is deliberately a *throw*, not a `console.warn`, because `cy.exec` swallows stdout/stderr warnings and the failure would surface many specs later.
- `redisUrl` is treated as missing if it is `undefined` **or** a string of only whitespace (`trim() === ''`), matching the "exported but empty" footgun.
- The error message intentionally names the shell-level variable (`NODE_RATE_LIMIT_REDIS_URL`) rather than a CYPRESS_* alias, because the fix is to export it in the same shell that launches Cypress, not to add it to `cypress.env.json`.
