/**
 * Cypress configuration — every suite that needs a real browser.
 *
 * ── Three profiles over one set of specs ─────────────────────────────────────────────────────
 * The specs do not know which backend they are talking to. `cy.resetState()` branches on the
 * `apiMockEnabled` flag, so the same file runs against MSW's in-memory database (the default),
 * against a faker-seeded random dataset, or against the real API — see the `test:e2e*` scripts.
 * A spec that only makes sense in one profile opens with `cy.skipUnlessLive()` rather than being
 * silently green in the others.
 *
 * ── Why the viewport is pinned here ──────────────────────────────────────────────────────────
 * Image dimensions are part of a visual diff, so a baseline recorded at one size can never match
 * another. Pinning it at the config level means no spec can drift by resizing.
 *
 * ── Node-side tasks ──────────────────────────────────────────────────────────────────────────
 * `cy.task` is the only way to run code with filesystem access: the browser cannot read the
 * committed baseline images, so the comparison itself lives in Node (`visual-task.ts`) and is
 * registered below.
 */
import { defineConfig } from 'cypress';
import { loadEnv } from 'vite';
import path from 'node:path';
import { resolveBackendPath } from './scripts/backendPath';
import { compareSnapshot } from './tests/e2e/support/visual-task';

const viteEnvironment = loadEnv('', process.cwd(), '');

export default defineConfig({
    screenshotsFolder: 'tests/e2e/screenshots',
    videosFolder: 'tests/e2e/videos',
    downloadsFolder: 'tests/e2e/downloads',
    // A FIXED viewport, because a screenshot's size is part of what is being compared. Cypress'
    // default is 1000x660; pinning it here means a future default change cannot silently
    // invalidate every baseline.
    viewportWidth: 1280,
    viewportHeight: 800,
    e2e: {
        /**
         * Node-side hooks. `compareVisualSnapshot` is the image diff behind
         * `cy.compareSnapshot()` — it has to run here because the browser cannot read the
         * committed baseline files. See `tests/e2e/support/visual-task.ts`.
         */
        setupNodeEvents(on) {
            on('task', {
                compareVisualSnapshot: (options: Parameters<typeof compareSnapshot>[0]) =>
                    compareSnapshot(options)
            });
        },
        /*
         * Only `tests/e2e/specs/` is swept. The visual suite lives in `tests/e2e/visual/` and is
         * run by its own script, deliberately outside this pattern.
         *
         * Not because it is unimportant, but because it is the one suite whose failures are
         * sometimes environmental — font rendering differs between a developer's machine and a
         * CI container — and folding a suite like that into the main e2e run makes the main run
         * untrustworthy. Kept separate, a red visual run means "go and look at the picture",
         * which is exactly the response it should provoke.
         *
         * Both directories are in `specPattern` because Cypress intersects `--spec` WITH it —
         * a spec outside the pattern cannot be run even when named explicitly, and
         * `excludeSpecPattern` is applied to explicit `--spec` too. So the split is made by each
         * npm script naming the set it wants, not by the config hiding one of them.
         */
        specPattern: 'tests/e2e/{specs,visual}/**/*.{cy,spec}.{js,jsx,ts,tsx}',
        supportFile: 'tests/e2e/support/e2e.ts',
        // Everything else about these tests lives under tests/e2e; Cypress' default would put the
        // upload fixtures in a `cypress/` folder at the repo root, alone.
        fixturesFolder: 'tests/e2e/fixtures',
        // Cypress' 4s default assumes a prebuilt app. These specs run against `vite dev`, which
        // compiles each route the first time it is visited, so the first assertion on a spec
        // waits for a build rather than for the app — and 4s is not enough on a loaded machine.
        defaultCommandTimeout: 15_000,
        // 8085 sits in this repo's 8080-8099 host-port block.
        baseUrl: 'http://localhost:8085',
        allowCypressEnv: false,
        env: {
            apiUrl: viteEnvironment.VITE_API_URL ?? 'http://localhost:3000',
            // Which profile the specs are running against. Defaults to the mock profile; the
            // `test:e2e:live` script overrides it with CYPRESS_apiMockEnabled=false. Cypress maps
            // any CYPRESS_* variable onto Cypress.env(), which is more predictable here than
            // relying on loadEnv to have picked up a process-level override.
            apiMockEnabled: true,
            // Only used by the live profile: `cy.resetState()` shells out to this checkout's
            // `db:seed:reset:host` to restore the seed dataset between tests. `BACKEND_PATH` env
            // override, or a sibling-checkout default, always resolved to an absolute path — see
            // scripts/backendPath.ts, shared with scripts/preflight-live.ts so the two can never
            // silently disagree about which backend they mean.
            backendPath: resolveBackendPath(),
            // Where committed baselines live, and where a failing diff is written.
            visualBaselineDirectory: path.resolve('tests/e2e/snapshots'),
            visualDiffDirectory: path.resolve('tests/e2e/snapshots/__diff__'),
            // Flipped by `npm run test:e2e:visual:update` to re-record rather than compare.
            updateSnapshots: false
        }
    }
});
