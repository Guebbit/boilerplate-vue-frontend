#!/usr/bin/env tsx
/**
 * Preflight for `npm run test:e2e:live`, wired as `pretest:e2e:live` (npm's pre-script
 * convention runs this automatically before `test:e2e:live`).
 *
 * Capability 3 (FE against a live, hand-booted BE) has no CI to fail loudly in — it is run by a
 * person, by hand, and the previous failure mode was a wall of Cypress network-error noise that
 * didn't say *why*. Each check below fails with exactly one actionable line instead. Order
 * matters: the checks run cheapest/most-likely-wrong first, and only the first failure prints.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';
import { DEFAULT_BACKEND_PATH, resolveBackendPath } from './backendPath';

const HEALTH_CHECK_TIMEOUT_MS = 3000;

const fail = (message: string): never => {
    console.error(`\n[preflight:live] ${message}\n`);
    process.exit(1);
};

const checkBackendReachable = async (apiUrl: string): Promise<void> => {
    try {
        const response = await fetch(apiUrl, { signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        fail(
            `Backend not reachable at ${apiUrl} (${error instanceof Error ? error.message : String(error)}).\n` +
                `  Boot it:\n` +
                `    cd ${DEFAULT_BACKEND_PATH}\n` +
                `    docker compose up -d\n` +
                `    npm run db:bootstrap:host`
        );
    }
};

const checkBackendSeedScript = (backendPath: string): void => {
    const backendPackageJsonPath = path.join(backendPath, 'package.json');
    if (!existsSync(backendPackageJsonPath)) {
        fail(
            `No package.json found at ${backendPath}.\n` +
                `  Override with BACKEND_PATH=<path to boilerplate-node-api-mongodb-mongoose>`
        );
    }

    const backendPackageJson = JSON.parse(readFileSync(backendPackageJsonPath, 'utf8')) as {
        scripts?: Record<string, string>;
    };
    if (!backendPackageJson.scripts?.['db:seed:reset:host']) {
        fail(
            `${backendPackageJsonPath} has no "db:seed:reset:host" script — cy.resetState() would ` +
                `fail mid-run instead of here.\n` +
                `  Resolved backend path: ${backendPath}\n` +
                `  Override with BACKEND_PATH=<path to boilerplate-node-api-mongodb-mongoose>`
        );
    }
};

const md5 = (filePath: string): string => createHash('md5').update(readFileSync(filePath)).digest('hex');

const checkSpecParity = (backendPath: string): void => {
    const feSpecPath = path.resolve(process.cwd(), 'openapi.yaml');
    const beSpecPath = path.join(backendPath, 'openapi.yaml');
    if (!existsSync(beSpecPath)) {
        fail(`No openapi.yaml found at ${beSpecPath} — cannot verify spec parity.`);
    }

    const feHash = md5(feSpecPath);
    const beHash = md5(beSpecPath);
    if (feHash !== beHash) {
        fail(
            `Spec drift: this repo's openapi.yaml (md5 ${feHash}) does not match the backend's ` +
                `(md5 ${beHash}) at ${beSpecPath}.\n` +
                `  Regenerate before trusting this run — whichever repo is behind, sync openapi.yaml ` +
                `then run "npm run genapi".`
        );
    }
};

const main = async (): Promise<void> => {
    const viteEnvironment = loadEnv('', process.cwd(), '');
    const apiUrl = viteEnvironment.VITE_API_URL ?? 'http://localhost:3000';
    const backendPath = resolveBackendPath();

    await checkBackendReachable(apiUrl);
    checkBackendSeedScript(backendPath);
    checkSpecParity(backendPath);

    console.log(
        `[preflight:live] backend reachable at ${apiUrl}, seed script found at ${backendPath}, specs match.`
    );
};

await main();
