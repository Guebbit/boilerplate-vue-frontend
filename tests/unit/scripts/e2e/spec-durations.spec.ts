/**
 * `scripts/e2e/spec-durations.ts` — the real per-file weights the shard balancer needs to
 * use instead of one shared-by-basename number. Driven against a temp path, never the real
 * `reports/` directory.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readSpecDurations, recordSpecDuration } from '../../../../scripts/e2e/spec-durations';

/** Scratch directories made by a case, removed after it. */
const scratch: string[] = [];

/** A report path inside a fresh temp directory. */
const reportFile = (): string => {
    const directory = mkdtempSync(path.join(tmpdir(), 'spec-durations-'));
    scratch.push(directory);
    return path.join(directory, 'nested', 'durations.jsonl');
};

afterEach(() => {
    for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('readSpecDurations', () => {
    it('is empty for a report that was never written', () => {
        expect(readSpecDurations(reportFile())).toEqual({});
    });

    it('keys the result by spec path, distinguishing two files that share a basename', () => {
        const file = reportFile();

        recordSpecDuration({ spec: 'src/modules/orders/tests/e2e/a11y.cy.ts', seconds: 12 }, file);
        recordSpecDuration(
            { spec: 'src/modules/products/tests/e2e/a11y.cy.ts', seconds: 40 },
            file
        );

        expect(readSpecDurations(file)).toEqual({
            'src/modules/orders/tests/e2e/a11y.cy.ts': 12,
            'src/modules/products/tests/e2e/a11y.cy.ts': 40
        });
    });

    it('keeps the most recently recorded duration for a spec run more than once', () => {
        const file = reportFile();

        recordSpecDuration({ spec: 'a.cy.ts', seconds: 10 }, file);
        recordSpecDuration({ spec: 'a.cy.ts', seconds: 25 }, file);

        expect(readSpecDurations(file)).toEqual({ 'a.cy.ts': 25 });
    });

    it('skips a line it cannot parse instead of throwing', () => {
        const file = reportFile();
        recordSpecDuration({ spec: 'a.cy.ts', seconds: 10 }, file);
        writeFileSync(file, '{not json\n', { flag: 'a' });

        expect(readSpecDurations(file)).toEqual({ 'a.cy.ts': 10 });
    });
});
