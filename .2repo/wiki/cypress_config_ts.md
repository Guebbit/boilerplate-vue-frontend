# cypress.config.ts

## Purpose

Cypress configuration for all browser-based E2E tests. It defines the two runtime profiles (demo backend vs. live API), pins the viewport for visual-diff stability, registers Node-side `cy.task` handlers that the browser cannot perform (filesystem reads, second-session auth, a11y report writing), and sets execution-tuning options (retries, memory management, timeouts) appropriate for sharded headless runs.

## Key elements

- **`defineConfig` export** — single default export; all Cypress runtime settings live here.
- **Viewport pin (`1280 × 800`)** — prevents silent baseline invalidation if Cypress's default ever changes.
- **`retries`** — `runMode: 1`, `openMode: 0`; one retry isolates shard contention from real bugs; zero retries in interactive mode so developers see the first failure.
- **`experimentalMemoryManagement` + `numTestsKeptInMemory: 5`** — prevents V8 heap aborts during long single-process live runs.
- **`specPattern: ALL_SPEC_GLOBS`** — union of all E2E spec globs (domain-co-located + central); every directory must appear here because Cypress intersects `--spec` with `specPattern`.
- **`setupNodeEvents` / `on('task', …)`** — registers five tasks:
  - `adminApi` — authenticated admin call from Node, keeping the page's session untouched.
  - `createSession` — opens a second demo-user session via raw `fetch`.
  - `compareVisualSnapshot` — image diff against committed baselines (browser can't read the filesystem).
  - `recordA11yViolations` — writes axe findings to `reports/a11y/<spec>.json`.
  - `warn` — terminal `console.warn` for non-fatal diagnostics.
- **`userAgent` override** — masquerades as a real Chrome so Umami doesn't silently discard events; also keeps server-forwarded UA honest.
- **`env.liveProfile` / `env.apiUrl`** — profile switch and backend URL, read via Vite's `loadEnv` + `process.loadEnvFile()`.
- **`allowCypressEnv: false`** — blocks specs from reading `CYPRESS_*` variables at runtime.

## Relationships

- **`scripts/cypress-spec-globs.ts`** — supplies `ALL_SPEC_GLOBS`, the array used as `specPattern`. The npm scripts name subsets of these globs; this file exposes the full union so nothing is accidentally excluded.
- **`scripts/paired-backend-path.ts`** — supplies `resolveBackendPath()` and `resolveLiveResetCommand()`, which read `process.env` to determine which backend a checkout is paired with and which seed-reset command to invoke. Shared with `scripts/check-spec-identity.ts` for consistency.
- **`tests/support/e2e/visual-task.ts`** — exports `compareSnapshot`, imported and re-registered as the `compareVisualSnapshot` task.
- **`tests/support/e2e/a11y-task.ts`** — exports `recordA11yViolations` and the `A11yRecordRequest` type, re-registered as the `recordA11yViolations` task.
- **`tests/support/e2e/admin-api-task.ts`** — exports `adminApi`, re-registered as the `adminApi` task.
- **`tsconfig.cypress.json`** — the TS project that gives co-located E2E specs (under `src/modules/*/tests/e2e/`) Cypress ambient types; this config's `specPattern` is what makes those directories part of the Cypress scope.

## Notes

- The visual suite (`tests/e2e/visual/`) is **deliberately excluded** from the main E2E npm scripts; it is run by its own script because font-rendering differences make its failures environmental rather than code bugs.
- `specPattern` must list **every** spec directory (including the visual one) because Cypress applies `excludeSpecPattern` to explicit `--spec` invocations as well — a spec outside the pattern cannot be run at all.
- `process.loadEnvFile()` is wrapped in a `try/catch` because CI injects variables as real env vars; a bare `.env` is optional.
- `defaultCommandTimeout` is raised to 15 s (vs. Cypress's 4 s) because four shards share one preview server and one machine; first assertions can queue behind three other browsers.
