/**
 * @module
 * What the audit build is given: the environment (every URL loopback) and which container-start
 * generators it runs. Split from `build.ts` so the unit suite can import it.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { sinkCollectUrl, sinkScriptUrl } from './analytics-sink';

/** The audit build's output folder (gitignored). */
export const AUDIT_BUILD_DIR = 'dist-lighthouse';

/** The backend the audit build talks to: the demo backend every single-process e2e script boots. */
export const AUDIT_API_URL = 'http://localhost:3100';

/** The fixed demo Umami website id (`.env-example`), so the tracker has an id to work with. */
const DEMO_UMAMI_WEBSITE_ID = '00000000-0000-4000-8000-000000000001';

/**
 * The environment the build and the generators run with. It overrides whatever a developer's
 * `.env` bakes in: every URL is loopback, so the audit proves nothing depends on an outside host.
 *
 * @param sinkPort - the analytics sink's port
 */
export const auditEnvironment = (sinkPort: number): Record<string, string> => ({
    VITE_API_URL: AUDIT_API_URL,
    VITE_TOURS_ENABLED: 'false',
    VITE_FARO_URL: sinkCollectUrl(sinkPort),
    VITE_UMAMI_SRC: sinkScriptUrl(sinkPort),
    VITE_UMAMI_WEBSITE_ID: DEMO_UMAMI_WEBSITE_ID,
    // Read by the sitemap lane's robots script once it exists; a variable no script reads is harmless.
    VITE_ROBOTS_INDEX: 'true',
    VITE_SITEMAP_URL: `${AUDIT_API_URL}/sitemap/index.xml`
});

/**
 * The container-start generators, in run order.
 *
 * @param directory - `docker/docker-entrypoint.d`
 */
export const generatorScripts = (directory: string): string[] =>
    readdirSync(directory)
        .filter((name) => /-generate-.*\.sh$/.test(name))
        .toSorted()
        .map((name) => path.join(directory, name));
