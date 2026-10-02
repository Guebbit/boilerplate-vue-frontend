---
source: cypress.config.ts
sha256: 87300552b1b3bd8f22a521ab167c26dcae0859379c7da2f9eeb22580bd35c170
generated_at: 2026-10-02T14:31:54.801970+00:00
model: ollama:qwen3.8:27b
---

# cypress.config.ts

## Purpose

Cypress configuration that wires together the e2e suite: it defines viewport, retries, memory settings, the `@cypress/grep` tier filter, and registers every Node-side `cy.task` the browser cannot perform (image diffing, server-side auth, TOTP generation, webhook delivery). It also loads the project `.env` and Vite variables so that the `demo` vs `live` profile branching (driven by `liveProfile`) resolves correctly before any spec executes.

## Key elements

- **`defineConfig` export** — the single default export. Sets `viewportWidth/Height` (1280×800), `retries` (run 1 / open 0), `experimentalMemoryManagement`, `numTestsKeptInMemory`, folder paths, and `expose.grepTags` / `grepFilterSpecs`.
- **`hostedWebhookSink()`** — memoised singleton that starts a webhook sink on the port from `E2E_WEBHOOK_SINK_PORT` (or `SINGLE_PROCESS_SINK_PORT`). Persists across repeated `setupNodeEvents` calls (e.g. `cypress open` hot-reload).
- **`setupNodeEvents` → `on('before:run')`** — resets the flaky-test report for non-sharded runs.
- **`setupNodeEvents` → `on('after:spec')`** — records per-test flaky results and per-spec duration (used by the shard balancer).
- **`setupNodeEvents` → `on('task', …)`** — registers tasks: `adminApi`, `deviceLogin`/`deviceRefresh`/`deviceRequest`, `postPaymentWebhook`, `totpCode`, `webhookSinkRequests`/`webhookSinkClear`/`webhookSignatureValid`, `readWebhookTester`, `recordA11yViolations`, `compareVisualSnapshot`.
- **Env bootstrap** — `process.loadEnvFile()` (swallowed on failure) followed by Vite's `loadEnv`, executed at module top-level before any task reads `process.env`.
- **`ALL_SPEC_GLOBS` import** — consumed by the spec globbing / sharding logic (referenced for completeness of the `e2e.specPattern` or test orchestration).

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** — imports `LIVE_SCENARIO_FILE`, `resolveBackendPath`, `resolveLiveResetCommand`; the config reads these to determine which backend the checkout is paired with and to register the `readScenarioFile` task.
- **`scripts/e2e/cypress-spec-globs.ts`** — imports `ALL_SPEC_GLOBS` for spec discovery / sharding.
- **`scripts/e2e/flaky-report.ts`** — imports `flakyTestsIn`, `recordFlakyTests`, `resetFlakyReport`; the `before:run`/`after:spec` hooks call these to track retry-passes.
- **`scripts/e2e/spec-durations.ts`** — imports `recordSpecDuration`; called in `after:spec` to feed the shard balancer.
- **`scripts/e2e/device-session.ts`** — imports `deviceLogin`, `deviceRefresh`, `deviceRequest`; registered as tasks so a second device can be authenticated server-side without touching the browser cookie jar.
- **`scripts/e2e/payment-webhook.ts`** — imports `postPaymentWebhook`; registered as a task to sign and POST a payment-provider event.
- **`scripts/e2e/totp.ts`** — imports `totpCode`; registered as a task (browser bundle lacks the needed crypto).
- **`scripts/e2e/webhook-sink.ts`** — imports `SINGLE_PROCESS_SINK_PORT`, `startWebhookSink`, `verifiesStandardWebhook`; the config hosts the sink and exposes it via tasks.
- **`scripts/e2e/webhook-tester.ts`** — imports `readWebhookTester`; registered as a task to read captured deliveries.
- **`tests/support/e2e/visual-task.ts`** — imports `compareSnapshot`; registered as the `compareVisualSnapshot` task (browser cannot read baseline files).
- **`tests/support/e2e/a11y-task.ts`** — imports `recordA11yViolations` and the `A11yRecordRequest` type; registered as the `recordA11yViolations` task.
- **`tests/support/e2e/admin-api-task.ts`** — imports `adminApi`; registered as a task so fixtures can make authenticated calls without mutating the page's session.
- **`tsconfig.cypress.json`** — the `tsconfig` that includes this file and its imports under the Cypress-specific compiler path (ensures `node:` prefix and type-checking work).

## Notes

- **`expose.grepTags` vs `env.grepTags`** — `@cypress/grep` v7 reads the filter from `expose`, not `env`. A `CYPRESS_grepTags` env var is silently ignored. Always set via `expose` (sourced from `E2E_GREP_TAGS`).
- **Webhook sink is a singleton** — `hostedWebhookSink()` caches the promise in a module-level `let`. Re-registering a second listener on the same port would throw; this pattern exists specifically because `cypress open` re-invokes `setupNodeEvents` on config changes.
- **Memory settings are load-bearing for live runs** — `test:e2e:live` runs all specs in one process; without `experimentalMemoryManagement` + `numTestsKeptInMemory: 5`, V8 heap pressure causes a hard crash (`trap invalid opcode`). These flags are not optional tuning knobs.
- **`process.loadEnvFile()` is wrapped in `try/catch`** — CI passes real environment variables; a missing `.env` in a local checkout is expected and must not abort config loading.
- **Viewport is intentionally pinned at config level** (not per-spec) so no spec can drift the size and silently invalidate visual baselines.
