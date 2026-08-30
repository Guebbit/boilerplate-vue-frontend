# cypress.config.ts

## Purpose

Cypress configuration for all E2E specs that require a real browser. It defines a single set of specs run under two profiles (demo backend by default, live API when `CYPRESS_liveProfile=true`), pins the viewport to keep visual baselines stable, and registers every Node-side task that the browser cannot perform (image diffing, a11y report writing, admin API calls, session creation).

## Key elements

- **`defineConfig` export** — the sole export; passes all settings to Cypress.
- **`process.loadEnvFile()` / `loadEnv()`** — loads `.env` into `process.env` and exposes `VITE_API_URL` before the rest of the config reads it.
- **`A11Y_REPORT_TASK` / `A11Y_REPORT_DIRECTORY`** — constants shared with `commands.ts` that name the task and output directory for accessibility reports.
- **`setupNodeEvents` → task registrations:**
  - `compareVisualSnapshot` — delegates to `visual-task.ts` for pixel-diff against committed baselines.
  - `recordA11yViolations` — writes axe findings to `reports/a11y/<spec>.json`.
  - `adminApi` — single authenticated admin call made from Node (avoids touching the browser cookie jar).
  - `createSession` — opens a second server-side session via a plain `fetch` login.
  - `warn` — prints `[e2e] …` to the terminal for non-fatal notes (chosen over `cy.log` so the message is visible in headless runs).
- **`specPattern: ALL_SPEC_GLOBS`** — imported from `scripts/cypress-spec-globs.ts`; covers both module-colocated specs (`src/modules/*/tests/e2e/`) and central specs (`tests/e2e/specs/`). The visual suite (`tests/e2e/visual/`) is intentionally excluded from the main run.
- **`supportFile`** — points to `tests/support/e2e/e2e.ts`.
- **`env.liveProfile`** — boolean flag specs branch on via `cy.resetState()` / `cy.skipUnlessLive()`.
- **`env.backendPath` / `env.liveResetCommand`** — resolved at config-load time from `scripts/paired-backend-path.ts`; used only by the live profile.
- **`userAgent`** — a real Chrome UA string so Umami does not silently discard all analytics events.
- **`retries`** — `runMode: 1`, `openMode: 0`.
- **`defaultCommandTimeout: 15_000`** — raised from the 4 s default to tolerate four concurrent shards sharing one preview server.
- **`viewportWidth: 1280` / `viewportHeight: 800`** — pinned globally; changing it invalidates every visual baseline.
- **`allowCypressEnv: false`** — prevents specs from mutating config at runtime.

## Relationships

- **`scripts/cypress-spec-globs.ts`** — supplies `ALL_SPEC_GLOBS`, the array used as `specPattern`. All npm scripts that invoke `cypress run --spec …` rely on the glob being present here.
- **`scripts/paired-backend-path.ts`** — provides `resolveBackendPath()` and `resolveLiveResetCommand()`, which are called at module load to populate `env.backendPath` and `env.liveResetCommand`. Shared with `scripts/check-spec-identity.ts` so both agree on which paired backend a checkout targets.
- **`tests/support/e2e/a11y-task.ts`** — exports `recordA11yViolations` and the `A11yRecordRequest` type, both registered as the `recordA11yViolations` task.
- **`tests/support/e2e/admin-api-task.ts`** — exports `adminApi`, registered as the `adminApi` task.
- **`tests/support/e2e/commands.ts`** — the support file that calls the registered tasks (`cy.compareSnapshot()`, `cy.checkPageA11y()`, `cy.resetState()`, etc.). Must use the exact task names defined here (e.g. `A11Y_REPORT_TASK`).
- **`tests/support/e2e/visual-task.ts`** — exports `compareSnapshot`, registered as the `compareVisualSnapshot` task.
- **`tsconfig.cypress.json`** — the TS config that includes the module-colocated `tests/e2e/` folders and this config file itself, giving them Cypress ambient types instead of the app's `tsconfig.app.json` types.

## Notes

- The visual suite (`tests/e2e/visual/`) is **not** in `ALL_SPEC_GLOBS`; it is run by a separate npm script. Folding it into the main run would make a red visual result (often environmental) look like a real regression.
- `specPattern` must list **every** directory a spec might live in, because Cypress intersects `--spec` with `specPattern`—a spec outside the pattern cannot be run even when named explicitly.
- The `userAgent` override is **not** settable per-spec (the UA is fixed at browser launch). Any spec that depends on analytics events is implicitly dependent on this line.
- `createSession` returns only a boolean (`response.ok`), not the response body; callers that need session data must handle that.
- `liveResetCommand` can be `null` when `LIVE_RESET_COMMAND` is unset; in that case the live profile runs without resetting the seed dataset between tests.
