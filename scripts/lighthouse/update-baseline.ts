#!/usr/bin/env tsx
/**
 * Ratchets `lighthouse-baseline.json` with the proposed baseline the last run wrote —
 * `npm run test:lighthouse:baseline`.
 *
 * Exit 2 when there is no proposed baseline. Review the diff, then commit it as usual.
 * See: docs/tools/lighthouse.md#baseline-and-ratchet
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
    LIGHTHOUSE_BASELINE_PATH,
    PROPOSED_BASELINE_PATH,
    ratchet,
    readBaseline,
    type LighthouseBaseline
} from './baseline';

if (existsSync(PROPOSED_BASELINE_PATH)) {
    const proposed = JSON.parse(readFileSync(PROPOSED_BASELINE_PATH, 'utf8')) as LighthouseBaseline;
    const { baseline, added, improved, dropped } = ratchet(
        readBaseline(),
        proposed.cases,
        proposed.environment,
        Object.keys(proposed.cases),
        proposed.generatedAt
    );
    writeFileSync(LIGHTHOUSE_BASELINE_PATH, `${JSON.stringify(baseline, undefined, 4)}\n`);
    console.log(
        `[lighthouse-baseline] ${LIGHTHOUSE_BASELINE_PATH}: ${String(added.length)} added, ` +
            `${String(improved.length)} improved, ${String(dropped.length)} dropped`
    );
} else {
    console.error(
        '[lighthouse-baseline] no proposed baseline: run `npm run test:lighthouse` first'
    );
    process.exitCode = 2;
}
