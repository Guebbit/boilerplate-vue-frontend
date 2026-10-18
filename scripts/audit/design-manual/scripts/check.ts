#!/usr/bin/env tsx
/**
 * Checks the citations of a design review — `npm run audit:design:check -- <SCOPE>`.
 *
 * Reads `<SCOPE>.verified.md` (or `<SCOPE>.findings.md` before the verifier ran) from the report
 * folder and the capture's `manifest.json`, then prints every row whose tile or `file:line` does
 * not resolve. Exits 1 on any failure, so the skill can drop those rows and count them.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { checkReport } from './check-report';
import { CAPTURE_DIR, type DesignCaptureManifest, REPORT_DIR } from './manifest';

/** The scope the skill passed; the report files are named after it. */
const scope = process.argv[2];
if (!scope) {
    process.stderr.write(
        'audit:design:check: pass the scope, e.g. `npm run audit:design:check -- orders`\n'
    );
    process.exit(2);
}

const verified = path.join(REPORT_DIR, `${scope}.verified.md`);
const reportFile = existsSync(verified) ? verified : path.join(REPORT_DIR, `${scope}.findings.md`);

const manifestFile = path.join(CAPTURE_DIR, 'manifest.json');
if (!existsSync(reportFile) || !existsSync(manifestFile)) {
    process.stderr.write(
        `audit:design:check: ${existsSync(reportFile) ? manifestFile : reportFile} does not exist\n`
    );
    process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as DesignCaptureManifest;

const { checked, failures } = checkReport(readFileSync(reportFile, 'utf8'), {
    manifestTiles: new Set(manifest.shots.flatMap((shot) => shot.tiles.map((tile) => tile.path))),
    fileExists: (file) => existsSync(file),
    lineCount: (file) =>
        existsSync(file) ? readFileSync(file, 'utf8').split('\n').length : undefined
});

for (const failure of failures)
    process.stdout.write(`${failure.row} · ${failure.column}: ${failure.reason}\n`);
process.stdout.write(
    `${reportFile}: ${String(checked)} rows checked, ${String(failures.length)} problems\n`
);
process.exit(failures.length === 0 ? 0 : 1);
