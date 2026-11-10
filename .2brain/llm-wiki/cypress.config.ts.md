---
source: cypress.config.ts
sha256: cfe6a04e018da7cb9cf49c8ac36800c3c7bc28121a0b4a592f412a4929a4f3b4
signature: aec071d2777cc8e31d4ae462c777341d5431f4c30d27a42acc04a3cbecf8f23f
generated_at: 2026-11-10T02:13:32.607588+00:00
model: ollama:qwen3.8:27b
---

# cypress.config.ts

## Purpose

Central Cypress configuration for all browser-based e2e suites. It pins the viewport (so visual baselines are comparable), selects the demo-vs-live backend profile via env flags, registers every Node-side task (image diff, a11y, layout, touch, design capture, webhooks, device sessions), and wires up flaky-test reporting and spec-duration tracking. Specs stay profile-agnostic; this file and the env it loads decide where they point.

## Key elements

- **`export default defineConfig({...})`** — the single config object: viewport pin, retry policy, memory-management flags, `expose` (grep tags, design-capture mode), `e2e.setupNodeEvents`.
- **`setupNodeEvents`** — registers all `cy.task` handlers (`compareSnapshot`, `recordA11yViolations`, `recordLayoutFindings`, `recordTouchFindings`, `recordDesignShot`, `stitchDesignCapture`, `postPaymentWebhook`, `deviceLogin/Refresh/Request`, `totpCode`, etc.) and the `before:browser:launch`, `before:run`, `after:spec` hooks.
- **`hostedWebhookSink` / `webhookSink`** — lazy-starts the in-process webhook sink on the port from `E2E_WEBHOOK_SINK_PORT`; survives `cypress open` config reloads via the module-level `webhookSink` variable.
- **`process.loadEnvFile()` + `loadEnv`** — loads `.env` into `process.env` before any pairing or sink logic reads it; CI supplies the same vars as real environment variables.
- **Viewport pinning** — `viewportWidth`/`viewportHeight` come from `VIEWPORTS.desktop`; a comment explains why (screenshot size is part of the diff).
- **Retry policy** — `retries: { runMode: 1, openMode: 0 }`; retry-passes are still recorded via the `after:spec` hook into `flaky-report.ts`.
- **Memory management** — `experimentalMemoryManagement: true` + `numTestsKeptInMemory: 5` to prevent V8 heap aborts in long single-session live runs.
- **`expose.grepTags`** — tier filter from `E2E_GREP_TAGS` (set by CI), read via `expose` rather than `env` for @cypress/grep v7 compatibility.

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** — provides `LIVE_SCENARIO_FILE`, `resolveBackendPath`, `resolveLiveResetCommand`; consumed by the `readScenarioFile` task and backend routing logic.
- **`scripts/e2e/viewports.ts`** — supplies `VIEWPORTS` used for the pinned config viewport and the headless window sizing in `before:browser:launch`.
- **`scripts/e2e/browser-launch.ts`** — provides `windowFor`, `withWindowSize`, `withDesktopPointer` for the single `before:browser:launch` handler (Cypress keeps only the last registered).
- **`scripts/e2e/flaky-report.ts`** — `resetFlakyReport` (before:run), `recordFlakyTests`/`flakyTestsIn` (after:spec) track retry-passes.
- **`scripts/e2e/spec-durations.ts`** — `recordSpecDuration` in `after:spec` feeds the shard balancer's weights.
- **`scripts/e2e/live-rate-limit-guard.ts`** — `assertLiveRateLimitStore` called at the top of `setupNodeEvents` to fail fast if the limiter's Redis URL is missing in live mode.
- **`scripts/e2e/webhook-sink.ts`** — `startWebhookSink`, `verifiesStandardWebhook`, `SINGLE_PROCESS_SINK_PORT` back the hosted sink task.
- **`scripts/e2e/webhook-tester.ts`** — `readWebhookTester` exposed as a task for specs that need to inspect sink state.
- **`scripts/e2e/payment-webhook.ts`** — `postPaymentWebhook` task for simulating payment events.
- **`scripts/e2e/device-session.ts`** — `deviceLogin`, `deviceRefresh`, `deviceRequest` tasks for device-pairing flows.
- **`scripts/e2e/totp.ts`** — `totpCode`, `loginTotpCodeFor`, `forgetLoginCodes` tasks for TOTP auth in specs.
- **`scripts/e2e/declared-statuses.ts`** — `declaredStatuses` task exposing the set of statuses a spec declares.
- **`scripts/e2e/cypress-spec-globs.ts`** — `ALL_SPEC_GLOBS` defines which spec files are picked up.
- **`scripts/audit/design-manual/scripts/capture-task.ts`** — `recordDesignShot`, `stitchDesignCapture` tasks for design-manual capture mode.
- **`github/workflows/visual.yml`** — CI entrypoint that sets `E2E_DESIGN_CAPTURE`, `E2E_GREP_TAGS`, and other env vars this config reads.

## Notes

- **One `before:browser:launch` handler rule:** Cypress discards all but the last registered handler for that event, so any new launch tweak must be composed inside the single call in `setupNodeEvents` (see `browser-launch.ts` helpers).
- **Webhook sink is module-level state:** `cypress open` re-invokes `setupNodeEvents` on config edits; the `webhookSink ??=` guard prevents a second `listen` on the same port.
- **`expose` vs `env`:** @cypress/grep v7 reads from `expose.grepTags`, not `CYPRESS_grepTags`. Passing the variable the wrong way silently disables filtering.
- **Live profile is single-process by design:** sharding would let multiple browsers mutate the same live data concurrently, so `test:e2e:live` runs all specs in one process — hence the memory-management flags.
- **`results` in `after:spec` can be `undefined`** for a skipped spec; the code guards with an `if (results)` check despite Cypress types saying otherwise.
- **`.env` is optional:** `process.loadEnvFile()` is wrapped in a try/catch; CI provides variables natively, so a missing file is not an error.
