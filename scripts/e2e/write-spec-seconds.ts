#!/usr/bin/env tsx
/**
 * Refreshes `spec-seconds.json` from a durations report: the worker behind `npm run e2e:spec-seconds`.
 *
 * Usage: `npm run e2e:spec-seconds [-- <durations.jsonl>]`, by default this checkout's
 * `reports/e2e/durations.jsonl` (or the nightly's `e2e-durations-*` artifacts concatenated into
 * one). Commit the result. Specs that no longer exist are dropped, so a deleted file leaves no entry.
 */
import { globSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { failScript } from '../fail-script';
import { FUNCTIONAL_SPEC_GLOBS } from './cypress-spec-globs';
import { SPEC_SECONDS_FILE, medianSpecSeconds } from './spec-durations';

/** Repo root, where the spec globs are relative to. */
const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

/** Every functional spec that exists now, as posix paths. */
const existing = new Set(
    globSync(FUNCTIONAL_SPEC_GLOBS, { cwd: REPO_ROOT }).map((entry) =>
        entry.split(path.sep).join('/')
    )
);

/** Median seconds per existing spec, from the report named on the command line or the default. */
const medians = medianSpecSeconds(process.argv[2], existing);

// An empty result is a missing or empty report; writing `{}` would wipe the committed weights.
if (Object.keys(medians).length === 0)
    failScript(new Error('No recorded durations for any existing spec: nothing written.'));
else writeFileSync(SPEC_SECONDS_FILE, `${JSON.stringify(medians, null, 4)}\n`);
