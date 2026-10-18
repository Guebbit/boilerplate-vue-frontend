#!/usr/bin/env tsx
/**
 * Builds what the audit serves: a production build in `dist-lighthouse`, plus the files a container
 * writes at start, produced by the very same scripts.
 *
 * Why the real generators: Lighthouse then audits the exact `config.js`, `security.txt` and (once
 * the sitemap lane lands) `robots.txt` production serves, and no second copy of the key whitelist
 * exists. Why a dedicated build: `build:e2e` turns response validation on, which would be measured
 * as app cost. See: docs/tools/lighthouse.md
 */
import { execFileSync } from 'node:child_process';
import { ANALYTICS_SINK_PORT } from './analytics-sink';
import { AUDIT_BUILD_DIR, auditEnvironment, generatorScripts } from './audit-environment';

const environment = { ...process.env, ...auditEnvironment(ANALYTICS_SINK_PORT) };

// The local vite binary, as `entry-chunk-budget.spec.ts` calls it.
// `vite build --outDir <dir>`: https://vite.dev/guide/cli.html#build
execFileSync('node_modules/.bin/vite', ['build', '--outDir', AUDIT_BUILD_DIR], {
    env: environment,
    stdio: 'inherit'
});

for (const script of generatorScripts('docker/docker-entrypoint.d'))
    execFileSync('sh', [script], {
        env: { ...environment, NGINX_HTML_ROOT: AUDIT_BUILD_DIR },
        stdio: 'inherit'
    });
