/**
 * `scripts/e2e/flaky-report.ts` — the list of tests that passed only on a retry.
 *
 * The property that matters is the filter: a first-attempt pass and a final failure are both NOT
 * flaky, and reporting either would bury the one signal this exists to surface. The file round
 * trip is driven against a temp path, never the real `reports/` directory.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    flakyTestsIn,
    formatFlakyReport,
    readFlakyTests,
    recordFlakyTests,
    resetFlakyReport,
    type FlakyTest
} from '../../../../scripts/e2e/flaky-report';

/** Scratch directories made by a case, removed after it. */
const scratch: string[] = [];

/** A report path inside a fresh temp directory. */
const reportFile = (): string => {
    const directory = mkdtempSync(path.join(tmpdir(), 'flaky-report-'));
    scratch.push(directory);
    return path.join(directory, 'nested', 'flaky.jsonl');
};

afterEach(() => {
    for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const ENTRY: FlakyTest = { spec: 'tests/e2e/specs/a.cy.ts', title: 'cart › adds', attempts: 2 };

describe('flakyTestsIn', () => {
    it('keeps a test that passed on a later attempt, with its full title', () => {
        const flaky = flakyTestsIn('a.cy.ts', [
            { title: ['cart', 'adds a line'], state: 'passed', attempts: [{}, {}] }
        ]);

        expect(flaky).toEqual([{ spec: 'a.cy.ts', title: 'cart › adds a line', attempts: 2 }]);
    });

    it('ignores a first-attempt pass and a test that failed every attempt', () => {
        const flaky = flakyTestsIn('a.cy.ts', [
            { title: ['steady'], state: 'passed', attempts: [{}] },
            { title: ['broken'], state: 'failed', attempts: [{}, {}] }
        ]);

        expect(flaky).toEqual([]);
    });
});

describe('the report file', () => {
    it('accumulates entries across writes, as concurrent shards append them', () => {
        const file = reportFile();

        recordFlakyTests([ENTRY], file);
        recordFlakyTests([{ ...ENTRY, spec: 'b.cy.ts' }], file);

        expect(readFlakyTests(file).map((entry) => entry.spec)).toEqual([
            'tests/e2e/specs/a.cy.ts',
            'b.cy.ts'
        ]);
    });

    it('creates nothing for a spec with no retry-passes', () => {
        const file = reportFile();

        recordFlakyTests([], file);

        expect(readFlakyTests(file)).toEqual([]);
    });

    it('starts empty again after a reset', () => {
        const file = reportFile();
        recordFlakyTests([ENTRY], file);

        resetFlakyReport(file);

        expect(readFlakyTests(file)).toEqual([]);
    });

    it('skips a line it cannot parse instead of throwing', () => {
        const file = reportFile();
        recordFlakyTests([ENTRY], file);
        writeFileSync(file, '{not json\n', { flag: 'a' });

        expect(readFlakyTests(file)).toEqual([ENTRY]);
    });
});

describe('formatFlakyReport', () => {
    it('prints nothing when nothing was flaky', () => {
        expect(formatFlakyReport([], true)).toEqual([]);
    });

    it('annotates each test as a GitHub warning in CI', () => {
        expect(formatFlakyReport([ENTRY], true)).toEqual([
            '[e2e] 1 test(s) passed only on a retry — flaky, not green:',
            '::warning file=tests/e2e/specs/a.cy.ts,title=Flaky e2e test::cart › adds (passed on attempt 2)'
        ]);
    });

    it('lists each test plainly outside CI', () => {
        expect(formatFlakyReport([ENTRY], false)[1]).toBe(
            '  - tests/e2e/specs/a.cy.ts › cart › adds (attempt 2)'
        );
    });
});
