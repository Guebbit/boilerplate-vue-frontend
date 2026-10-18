#!/usr/bin/env tsx
/**
 * Photographs the app for the design review — `npm run audit:design:capture -- [scope]`.
 *
 * The scope is empty (everything), `shell`, a module, a path or `--diff`. The module accessibility
 * sweeps run in capture mode through `npm run test:e2e:spec` (build, demo backend on :3100, `vite
 * preview` on :8085), and the rows each spec wrote are merged into `manifest.json`.
 *
 * A capture is a live e2e: it takes the e2e lock like any other (`flock /tmp/claude-e2e.lock`),
 * and never runs beside Stryker. Each run replaces the last one whole; the manifest says which
 * scope it covers.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { VIEWPORTS, type ViewportName } from '../../../e2e/viewports';
import { scopeToSpecs } from './capture-scope';
import {
    CAPTURE_DIR,
    mergeManifests,
    type DesignCaptureManifest,
    type DesignShot
} from './manifest';

/**
 * The files behind the chrome every screen shares: when one changes, every capture is stale.
 */
const CHROME_SOURCES = [
    'src/app/layouts/LayoutDefault.vue',
    'src/app/components/AppNavigation.vue',
    'src/app/components/AppAnalyticsConsentBanner.vue',
    'src/ui/vuetify/index.ts',
    'src/styles/main.css'
];

/** Runs git and returns its output, trimmed. */
const git = (...arguments_: string[]): string =>
    execFileSync('git', arguments_, { encoding: 'utf8' }).trim();

/** The modules that have an accessibility sweep. */
const sweptModules = (): string[] =>
    readdirSync('src/modules').filter((name) =>
        existsSync(`src/modules/${name}/tests/e2e/a11y.cy.ts`)
    );

/** The files the working tree touches, from `git status --porcelain`. */
const changedFiles = (): string[] =>
    // Not `git()`: its trim would eat the leading space of the first status line.
    execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => line.slice(3));

/**
 * Runs the sweeps in capture mode and resolves when the run ends.
 *
 * @param specs - repo-relative spec paths
 * @returns A promise that rejects with the exit code when the run fails
 */
const runCapture = (specs: string[]): Promise<void> =>
    new Promise((resolve, reject) => {
        const child = spawn('npm', ['run', 'test:e2e:spec'], {
            stdio: 'inherit',
            env: {
                ...process.env,
                E2E_SPEC: specs.join(','),
                E2E_DESIGN_CAPTURE: 'true',
                // Electron hides its scrollbars, so a scrolling page lays out at the viewport's
                // full width, as a phone does. Same switch as the visual suite.
                ELECTRON_EXTRA_LAUNCH_ARGS: '--hide-scrollbars'
            }
        });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`the capture run exited with code ${String(code)}`));
        });
    });

/** The rows each spec's part file holds. */
const readParts = (): DesignShot[][] => {
    const directory = path.join(CAPTURE_DIR, 'parts');
    if (!existsSync(directory)) return [];
    return readdirSync(directory)
        .filter((name) => name.endsWith('.jsonl'))
        .map((name) =>
            readFileSync(path.join(directory, name), 'utf8')
                .split('\n')
                .filter((line) => line !== '')
                .map((line) => JSON.parse(line) as DesignShot)
        );
};

/**
 * The viewport sizes a set of shots used.
 *
 * @param shots - the rows
 */
const viewportsOf = (shots: DesignShot[]): DesignCaptureManifest['viewports'] =>
    Object.fromEntries(
        [...new Set(shots.map(({ viewport }) => viewport))].map((name: ViewportName) => {
            const { width, height, touch } = VIEWPORTS[name];
            return [name, { width, height, touch }];
        })
    );

/** The scope the person typed, or the empty string. */
const scope = process.argv[2] ?? '';

const { specs, widened } = scopeToSpecs({
    scope,
    modules: sweptModules(),
    exists: existsSync,
    changedFiles: scope === '--diff' ? changedFiles() : []
});
if (widened) process.stdout.write('audit:design:capture: shared chrome changed, so every screen\n');

// A run replaces the last whole: its manifest describes exactly this run's scope.
rmSync(CAPTURE_DIR, { recursive: true, force: true });
mkdirSync(CAPTURE_DIR, { recursive: true });

const header: Omit<DesignCaptureManifest, 'shots' | 'viewports'> = {
    version: 1,
    gitHead: git('rev-parse', 'HEAD'),
    dirty: changedFiles(),
    capturedAt: new Date().toISOString(),
    scope,
    chromeSources: CHROME_SOURCES
};

runCapture(specs)
    .then(() => {
        const parts = readParts().map((shots): DesignCaptureManifest => ({
            ...header,
            viewports: viewportsOf(shots),
            shots
        }));
        const manifest = mergeManifests(parts);
        writeFileSync(
            path.join(CAPTURE_DIR, 'manifest.json'),
            `${JSON.stringify(manifest, null, 4)}\n`
        );
        const tiles = manifest.shots.reduce(
            (sum, { tiles: shotTiles }) => sum + shotTiles.length,
            0
        );
        process.stdout.write(
            `audit:design:capture: ${String(manifest.shots.length)} shots, ${String(tiles)} tiles → ${CAPTURE_DIR}/manifest.json\n`
        );
    })
    .catch((error: unknown) => {
        process.stderr.write(
            `audit:design:capture: ${error instanceof Error ? error.message : String(error)}\n`
        );
        process.exit(1);
    });
