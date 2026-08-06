import { defineConfig } from 'cypress';
import { loadEnv } from 'vite';
import { resolveBackendPath } from './scripts/backendPath';

const viteEnvironment = loadEnv('', process.cwd(), '');

export default defineConfig({
    screenshotsFolder: 'tests/e2e/screenshots',
    videosFolder: 'tests/e2e/videos',
    downloadsFolder: 'tests/e2e/downloads',
    e2e: {
        specPattern: 'tests/e2e/specs/**/*.{cy,spec}.{js,jsx,ts,tsx}',
        supportFile: 'tests/e2e/support/e2e.ts',
        // Cypress' 4s default assumes a prebuilt app. These specs run against `vite dev`, which
        // compiles each route the first time it is visited, so the first assertion on the first
        // spec waits for a build rather than for the app. It fits in 4s on an idle machine and
        // does not on a busy one: a full-suite run on a loaded box failed the first two
        // assertions of auth.cy.ts while the same spec passed cold in isolation. Raised rather
        // than papered over per-command, so the reason lives in one place.
        defaultCommandTimeout: 15_000,
        // 8085 sits in this repo's 8080-8099 host-port block. It used to be 4173, which the
        // paired backend's docs container also claimed — and `pretest:e2e` used to free it with
        // `fuser -k`, killing podman's port forwarder along with it.
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
            backendPath: resolveBackendPath()
        }
    }
});
