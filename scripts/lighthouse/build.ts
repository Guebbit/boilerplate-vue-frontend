#!/usr/bin/env tsx
/**
 * Builds what the audit serves: a production build in `dist-lighthouse`, plus the files a container
 * writes at start, produced by the very same scripts.
 *
 * Why the real generators: Lighthouse then audits the exact `config.js`, `security.txt` and
 * `robots.txt` production serves, and no second copy of the key whitelist
 * exists. Why a dedicated build: `build:e2e` turns response validation on, which would be measured
 * as app cost. See: docs/tools/lighthouse.md
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ANALYTICS_SINK_PORT } from './analytics-sink';
import { AUDIT_BUILD_DIR, auditEnvironment, generatorScripts } from './audit-environment';

const environment = { ...process.env, ...auditEnvironment(ANALYTICS_SINK_PORT) };

// The local vite binary, as `entry-chunk-budget.spec.ts` calls it.
// `vite build --outDir <dir>`: https://vite.dev/guide/cli.html#build
execFileSync('node_modules/.bin/vite', ['build', '--outDir', AUDIT_BUILD_DIR], {
    env: environment,
    stdio: 'inherit'
});

// The generators that write an nginx include get a scratch folder: there is no nginx here to read it.
const nginxConfigDirectory = mkdtempSync(path.join(os.tmpdir(), 'lighthouse-nginx-'));

for (const script of generatorScripts('docker/docker-entrypoint.d'))
    execFileSync('sh', [script], {
        env: {
            ...environment,
            NGINX_HTML_ROOT: AUDIT_BUILD_DIR,
            NGINX_CONF_DIR: nginxConfigDirectory
        },
        stdio: 'inherit'
    });
