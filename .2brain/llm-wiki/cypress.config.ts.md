---
source: cypress.config.ts
sha256: c889a2d89a370233f17616348a587564518c93340729710106b57ec16e3a5a70
generated_at: 2026-10-16T23:55:36.043107+00:00
model: ollama:qwen3.8:27b
---

# cypress.config.ts

## Purpose

Cypress configuration for all browser-based e2e suites. It pins the viewport, configures retry/memory behavior, wires Node-side tasks (filesystem access, server-side API calls, webhook sinks) that the browser cannot perform, and exposes tier-filter tags to `@cypress/grep`. The same spec set runs under a **demo** or **live** profile, selected at runtime via the `liveProfile` flag rather than via separate configs.

## Key elements

- **`defineConfig` (default export)** — viewport 1280×800, `retries: {runMode:1, openMode:0}`, `experimentalMemoryManagement`, `numTestsKeptInMemory: 5`, `expose.grepTags` (read from `E2E_GREP_TAGS`), screenshot/video/download folders.
- **`setupNodeEvents`** — registers all `cy.task` handlers and the `before:run` / `after:spec` lifecycle hooks.
  - *before:run* — calls `resetFlakyReport()` unless `E2E_SHARDED=true`.
  - *after:spec* — records flaky (retry-pass) tests and per-spec duration for the shard balancer.
  - *tasks* — `adminApi`, `guestApi`, `deviceLogin`, `deviceRefresh`, `deviceRequest`, `postPaymentWebhook`, `totpCode`, `webhookSinkRequests`, `webhookSinkClear`, `webhookSignatureValid`, `compareVisualSnapshot`, `recordA11yViolations`, `readScenarioFile`.
- **`hostedWebhookSink()`** — lazy singleton that starts the demo-profile webhook sink on the port from `E2E_WEBHOOK_SINK_PORT` (default `SINGLE_PROCESS_SINK_PORT`). Survives `cypress open` config-reload cycles.
- **`process.loadEnvFile()` + `loadEnv`** — populates `process.env` from `.env` before any pairing resolution runs, so `resolveBackendPath` and `resolveLiveResetCommand` see the same values as `check-spec-identity.ts`.
- **`A11Y_REPORT_TASK` / `A11Y_REPORT_DIRECTORY`** — constants shared with `tests/support/e2e/commands.ts` for the a11y task name and report output path.

## Relationships

| Neighbor | Interaction |
|---|---|
| `scripts/e2e/cypress-spec-globs.ts` | Supplies `ALL_SPEC_GLOBS` used as the spec pattern. |
| `scripts/e2e/device-session.ts` | Provides `deviceLogin`, `deviceRefresh`, `deviceRequest` — registered as Node tasks. |
| `scripts/e2e/flaky-report.ts` | Provides `resetFlakyReport`, `flakyTestsIn`, `recordFlakyTests` — used in lifecycle hooks. |
| `scripts/e2e/payment-webhook.ts` | Provides `postPaymentWebhook` — registered as a Node task. |
| `scripts/e2e/spec-durations.ts` | Provides `recordSpecDuration` — called in `after:spec`. |
| `scripts/e2e/totp.ts` | Provides `totpCode` — registered as a Node task. |
| `scripts/e2e/webhook-sink.ts` | Provides `startWebhookSink`, `SINGLE_PROCESS_SINK_PORT`, `verifiesStandardWebhook`, `WebhookSink` type — used by the sink singleton and signature task. |
| `scripts/e2e/webhook-tester.ts` | Provides `readWebhookTester` — used by the `webhookSignatureValid` task. |
| `scripts/pairing/paired-backend-path.ts` | Provides `LIVE_SCENARIO_FILE`, `resolveBackendPath`, `resolveLiveResetCommand` — drive demo-vs-live backend selection and the `readScenarioFile` task. |
| `tests/support/e2e/a11y-task.ts` | Provides `recordA11yViolations` and `A11yRecordRequest` type — registered as the a11y task. |
| `tests/support/e2e/admin-api-task.ts` | Provides `adminApi`, `guestApi` — registered as Node tasks for server-side admin calls. |
| `tests/support/e2e/visual-task.ts` | Provides `compareSnapshot` — the image-diff behind `cy.compareSnapshot()`. |
| `tsconfig.cypress.json` | TypeScript project config that includes this file for type-checking. |

## Notes

- **Viewport is deliberately 1280×800**, not Cypress's default 1000×660. Changing it invalidates every committed visual baseline; it is pinned here so no spec can drift.
- **`expose`, not `env`, for grep tags.** `@cypress/grep` v7 reads from `expose`; a `CYPRESS_grepTags` env var would be silently ignored.
- **Webhook sink is a module-level singleton** (`let webhookSink`). `cypress open` re-invokes `setupNodeEvents` on config changes; a second listener on the same port would throw.
- **`numTestsKeptInMemory: 5` + `experimentalMemoryManagement`** exist because the live profile runs all specs in one process against one shared backend (no sharding). Without them, long runs exhaust the V8 heap (`trap invalid opcode`).
- **Two-profile pattern:** specs do not know which backend they hit. `cy.restore()` branches on `liveProfile`; specs exclusive to one profile open with `cy.skipUnlessLive()` instead of silently passing in the other.
- **`process.loadEnvFile()`** is wrapped in `try/catch` — CI supplies the variables as real env vars, so a missing `.env` is expected and not an error.
