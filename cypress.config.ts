/**
 * Cypress configuration — every suite that needs a real browser.
 *
 * ── Two profiles over one set of specs ───────────────────────────────────────────────────────
 * The specs do not know which backend they are talking to. `cy.resetState()` branches on the
 * `liveProfile` flag, so the same file runs against the demo backend (the default) or
 * against the real API — see the `test:e2e*` scripts.
 * A spec that only makes sense in one profile opens with `cy.skipUnlessLive()` rather than being
 * silently green in the other.
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
import { resolveBackendPath, resolveLiveResetCommand } from './scripts/backend-path';
import { ALL_SPEC_GLOBS } from './scripts/spec-globs';
import { compareSnapshot } from './tests/support/e2e/visual-task';
import { recordA11yViolations } from './tests/support/e2e/a11y-task';
import { adminApi } from './tests/support/e2e/admin-api-task';
import type { A11yRecordRequest } from './tests/support/e2e/a11y-task';

/*
 * `.env` into `process.env`, before anything below reads it. `loadEnv` answers with the file's
 * contents but does not export them, and `resolveBackendPath()`/`resolveLiveResetCommand()` read
 * the real environment — the same pair `scripts/check-spec-identity.ts` uses, so both agree about
 * which backend a checkout is paired with. Node's own loader; a missing `.env` is not an error,
 * because CI passes these as real variables.
 */
try {
    process.loadEnvFile();
} catch {
    /* no .env in this checkout */
}

const viteEnvironment = loadEnv('', process.cwd(), '');

/** Name shared with `cy.checkPageA11y()` in `tests/support/e2e/commands.ts`. */
const A11Y_REPORT_TASK = 'recordA11yViolations';
const A11Y_REPORT_DIRECTORY = path.resolve('reports/a11y');

export default defineConfig({
    screenshotsFolder: 'tests/e2e/screenshots',
    videosFolder: 'tests/e2e/videos',
    downloadsFolder: 'tests/e2e/downloads',
    // A FIXED viewport, because a screenshot's size is part of what is being compared. Cypress'
    // default is 1000x660; pinning it here means a future default change cannot silently
    // invalidate every baseline.
    viewportWidth: 1280,
    viewportHeight: 800,
    /*
     * One retry in `cypress run`, none in `cypress open`. A headless run shares one preview
     * server and one machine with three other shards, and the specs already wait on conditions
     * rather than durations — so a test that fails once and passes on retry is contention, not
     * a bug, and one retry is what separates the two. None when open: a developer watching a
     * test wants to see the first failure, not a green that hid it.
     */
    retries: { runMode: 1, openMode: 0 },
    e2e: {
        /**
         * Node-side hooks. `compareVisualSnapshot` is the image diff behind
         * `cy.compareSnapshot()` — it has to run here because the browser cannot read the
         * committed baseline files. See `tests/support/e2e/visual-task.ts`.
         */
        setupNodeEvents(on) {
            on('task', {
                /**
                 * Opens a second session for the demo user, server-side: a plain Node fetch
                 * carries no browser cookie jar, so the page's own refresh cookie — and with it
                 * which session counts as "current" — is left untouched. The sessions specs use
                 * it to make "another device" exist without pretending.
                 */
                /**
                 * One authenticated admin call, made from Node — see
                 * `tests/support/e2e/admin-api-task.ts`. The e2e fixtures provision their own
                 * subjects through this rather than through `cy.request`, so the page's own
                 * session and refresh cookie are left exactly as the spec found them.
                 */
                adminApi: (request: Parameters<typeof adminApi>[0]) => adminApi(request),
                createSession: ({ apiUrl, email, password }: Record<string, string>) =>
                    fetch(`${apiUrl}/account/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    }).then((response) => response.ok),
                compareVisualSnapshot: (options: Parameters<typeof compareSnapshot>[0]) =>
                    compareSnapshot(options),
                /*
                 * Every axe finding `cy.checkPageA11y()` saw, blocking or not, to
                 * `reports/a11y/<spec>.json` — see `tests/support/e2e/a11y-task.ts`. Gitignored
                 * under `reports/` and uploaded by CI, like the visual diffs.
                 */
                [A11Y_REPORT_TASK]: (request: A11yRecordRequest) =>
                    recordA11yViolations(request, A11Y_REPORT_DIRECTORY),

                /*
                 * A line on the terminal from inside a spec, for the things that are worth
                 * knowing and not worth failing over — a mock reset that was slow but did
                 * finish, say.
                 *
                 * A task and not `cy.log` because the two go to different places: `cy.log`
                 * writes to the Cypress command log, which is read in `cypress open` and by
                 * nobody in `cypress run`. Warnings that only appear where nobody is looking
                 * train people to ignore the ones that do.
                 *
                 * Returns null because a task must return something serialisable; undefined
                 * makes Cypress fail the command.
                 */
                warn: (message: string) => {
                    console.warn(`[e2e] ${message}`);
                    return null;
                }
            });
        },
        /*
         * Two homes for the e2e specs, the same split the unit suite already makes (see
         * `vitest.config.ts`). A spec that exercises ONE domain lives inside it, at
         * `src/modules/<name>/tests/e2e/`, so `rm -rf src/modules/<name>` takes it along and no
         * orphan is left addressing routes that no longer exist. A spec that belongs to no single
         * domain — the shell, the locale layer, the accessibility sweep, the arcs that cross four
         * modules — stays central under `tests/e2e/specs/`, where a failure after a deletion is
         * correct signal rather than debris.
         *
         * A module's `tests/` folder is already outside `tsconfig.app.json`, the Vitest `include`,
         * the coverage `include` and the Stryker `mutate` list, so co-locating these costs no
         * scoping changes to any of the four. `tsconfig.cypress.json` is what claims them, which
         * is how they get Cypress' ambient types instead of the app's.
         *
         * The visual suite lives in `tests/e2e/visual/` and is run by its own script, deliberately
         * outside the sets the npm scripts name.
         *
         * Not because it is unimportant, but because it is the one suite whose failures are
         * sometimes environmental — font rendering differs between a developer's machine and a
         * CI container — and folding a suite like that into the main e2e run makes the main run
         * untrustworthy. Kept separate, a red visual run means "go and look at the picture",
         * which is exactly the response it should provoke.
         *
         * Every directory is in `specPattern` because Cypress intersects `--spec` WITH it —
         * a spec outside the pattern cannot be run even when named explicitly, and
         * `excludeSpecPattern` is applied to explicit `--spec` too. So the split is made by each
         * npm script naming the set it wants, not by the config hiding one of them.
         */
        specPattern: ALL_SPEC_GLOBS,
        supportFile: 'tests/support/e2e/e2e.ts',
        // Everything else about these tests lives under tests/e2e; Cypress' default would put the
        // upload fixtures in a `cypress/` folder at the repo root, alone.
        fixturesFolder: 'tests/e2e/fixtures',
        // Cypress' 4s default assumes a fast, idle machine. These specs run four shards against
        // one preview server and four demo backends, so the first assertion on a spec can be
        // queued behind three other browsers — and 4s is not enough under that contention.
        defaultCommandTimeout: 15_000,
        // 8085 sits in this repo's 8080-8099 host-port block.
        baseUrl: 'http://localhost:8085',
        /*
         * A real browser's user-agent, because Umami DISCARDS bot traffic and every browser
         * Cypress drives announces itself as one — Electron by default, `HeadlessChrome` under
         * `--browser chrome`. Umami answers 200 and records nothing, so the loss is silent.
         *
         * That takes both halves of the funnel down at once, not just the browser's: the API
         * forwards the caller's user-agent so its own events attribute to the same visitor, which
         * means a headless run makes the SERVER's events look like bot traffic too. Without this,
         * `analytics.cy.ts` can prove nothing — and it is written to fail rather than pass when it
         * cannot see the browser's own events, so this line is what keeps that check honest.
         *
         * Not settable per-spec: the user-agent is fixed when the browser launches, so it belongs
         * here rather than beside the one spec that depends on it.
         */
        userAgent:
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        allowCypressEnv: false,
        env: {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the env type declares the variable required, but a bare checkout has no .env to satisfy it
            apiUrl: viteEnvironment.VITE_API_URL ?? 'http://localhost:3000',
            // Which profile the specs are running against. Defaults to the demo profile (a
            // per-shard in-memory backend); `test:e2e:live` overrides it with
            // CYPRESS_liveProfile=true. Cypress maps any CYPRESS_* variable onto Cypress.env(),
            // which is more predictable here than relying on loadEnv to have picked up a
            // process-level override.
            liveProfile: false,
            // Only used by the live profile: `cy.resetState()` shells out to this checkout's
            // `host -- db:seed:reset` to restore the seed dataset between tests. `BACKEND_PATH` env
            // override, or a sibling-checkout default, always resolved to an absolute path — see
            // scripts/backend-path.ts, shared with scripts/check-spec-identity.ts so the two can
            // never silently disagree about which backend they mean.
            backendPath: resolveBackendPath(),
            // Only used by the live profile: the command `cy.resetState()` shells out to. The two
            // paired backends expose the reset through different runners, so this is a command
            // rather than a script name — see scripts/backend-path.ts.
            liveResetCommand: resolveLiveResetCommand(),
            /*
             * Where the live profile reads its analytics back from. Both repos write into ONE
             * Umami website, and `analytics.cy.ts` is the only thing that can prove each event
             * arrives once rather than twice — a claim no unit test on either side can make,
             * because neither can see what the other wrote.
             *
             * Defaults match the backend's compose stack (`UMAMI_PORT`, `UMAMI_WEBSITE_ID`,
             * `UMAMI_ADMIN_*` in its `.env-example`), so the spec needs no setup when the stack is
             * up. Overridable for a Umami that was not started from that compose file.
             */
            umamiUrl: process.env.UMAMI_URL ?? 'http://localhost:3080',
            umamiWebsiteId: process.env.UMAMI_WEBSITE_ID ?? '00000000-0000-4000-8000-000000000001',
            umamiUser: process.env.UMAMI_ADMIN_USER ?? 'admin',
            umamiPassword: process.env.UMAMI_ADMIN_PASSWORD ?? 'umami',
            /*
             * Only the DIFF directory is configured. Baselines are resolved per spec, into a
             * `__snapshots__` folder beside it, so a module owns its own — see the `compareSnapshot`
             * command. Diffs stay central because they are throwaway output of a failed run:
             * gitignored under `reports/`, and uploaded from one place by CI.
             */
            visualDiffDirectory: path.resolve('reports/visual-diff'),
            // Flipped by `npm run test:e2e:visual:update` to re-record rather than compare.
            updateSnapshots: false
        }
    }
});
