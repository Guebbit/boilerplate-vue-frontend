#!/usr/bin/env tsx
/**
 * Plans the review batches of the last design capture — `npm run audit:design:plan -- [scope]`.
 *
 * Reads `manifest.json` from the capture folder, writes `batches.json` beside it and prints one
 * line per batch. The scope is a module name or a part of a spec path; empty means every shot.
 * Exits 1 when nothing is planned, so an empty capture cannot look like a clean review.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CAPTURE_DIR, type DesignCaptureManifest } from './manifest';
import { planBatches } from './plan-batches';

/** The scope the skill passed, or the empty string. */
const scope = process.argv[2] ?? '';

const manifestFile = path.join(CAPTURE_DIR, 'manifest.json');
if (!existsSync(manifestFile)) {
    process.stderr.write(
        `audit:design:plan: ${manifestFile} does not exist: run the capture first\n`
    );
    process.exit(1);
}

/** The manifest the capture wrote (the capture lane's contract: `DesignCaptureManifest`). */
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as DesignCaptureManifest;

const shots = manifest.shots.filter(
    (shot) => scope === '' || shot.module === scope || shot.spec.includes(scope)
);
const { batches, problem } = planBatches({ shots });

if (problem !== undefined) {
    process.stderr.write(
        `audit:design:plan: ${problem}${scope === '' ? '' : ` (scope "${scope}")`}\n`
    );
    process.exit(1);
}

mkdirSync(CAPTURE_DIR, { recursive: true });
writeFileSync(path.join(CAPTURE_DIR, 'batches.json'), `${JSON.stringify(batches, null, 4)}\n`);
for (const batch of batches)
    process.stdout.write(
        `${batch.name}: ${String(batch.shotIds.length)} shots, ${String(batch.tileCount)} tiles, ~${String(batch.estimatedTokens)} tokens\n`
    );
