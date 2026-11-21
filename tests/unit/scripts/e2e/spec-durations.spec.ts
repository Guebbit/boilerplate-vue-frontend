/**
 * `scripts/e2e/spec-durations.ts` — the real per-file weights the shard balancer needs to
 * use instead of one shared-by-basename number. Driven against a temp path, never the real
 * `reports/` directory.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { globSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    SPEC_SECONDS_FILE,
    medianSpecSeconds,
    readSpecDurations,
    recordSpecDuration,
    resolveSpecSeconds
} from '../../../../scripts/e2e/spec-durations';
import { SECONDS } from '../../../../scripts/e2e/shard-balancer';
import { FUNCTIONAL_SPEC_GLOBS } from '../../../../scripts/e2e/cypress-spec-globs';

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

describe('medianSpecSeconds', () => {
    it('takes the median over runs, so one slow run does not move a spec', () => {
        const file = reportFile();
        for (const seconds of [10, 90, 12]) recordSpecDuration({ spec: 'a.cy.ts', seconds }, file);
        for (const seconds of [10, 20]) recordSpecDuration({ spec: 'b.cy.ts', seconds }, file);

        expect(medianSpecSeconds(file)).toEqual({ 'a.cy.ts': 12, 'b.cy.ts': 15 });
    });
});

describe('medianSpecSeconds with an `only` set', () => {
    it('leaves out a spec outside the set', () => {
        const file = reportFile();
        recordSpecDuration({ spec: 'kept.cy.ts', seconds: 10 }, file);
        recordSpecDuration({ spec: 'gone.cy.ts', seconds: 10 }, file);

        expect(medianSpecSeconds(file, new Set(['kept.cy.ts']))).toEqual({ 'kept.cy.ts': 10 });
    });
});

describe('resolveSpecSeconds', () => {
    it('treats a 0 s measurement as unmeasured, so it is weighed at the mean', () => {
        const { seconds, unmeasured } = resolveSpecSeconds(
            ['x/zero.cy.ts'],
            {},
            { 'x/zero.cy.ts': 0 }
        );

        expect(seconds).toEqual({});
        expect(unmeasured).toEqual(['x/zero.cy.ts']);
    });

    it('prefers local recordings, then committed medians, then the table by basename', () => {
        const { seconds, unmeasured } = resolveSpecSeconds(
            ['x/local.cy.ts', 'x/committed.cy.ts', 'x/uploads.cy.ts', 'x/new.cy.ts'],
            { 'x/local.cy.ts': 5 },
            { 'x/local.cy.ts': 99, 'x/committed.cy.ts': 7 }
        );

        expect(seconds).toEqual({
            'x/local.cy.ts': 5,
            'x/committed.cy.ts': 7,
            'x/uploads.cy.ts': SECONDS.uploads
        });
        expect(unmeasured).toEqual(['x/new.cy.ts']);
    });
});

describe('the committed spec-seconds.json', () => {
    it('names only specs that still exist, so a deleted spec does not linger', () => {
        const root = path.resolve(import.meta.dirname, '..', '..', '..', '..');
        const existing = new Set(
            globSync(FUNCTIONAL_SPEC_GLOBS, { cwd: root }).map((f) => f.split(path.sep).join('/'))
        );
        const committed = Object.keys(
            JSON.parse(readFileSync(SPEC_SECONDS_FILE, 'utf8')) as Record<string, number>
        );

        expect(committed.filter((spec) => !existing.has(spec))).toEqual([]);
    });
});
