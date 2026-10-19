/**
 * `scripts/mutation/overlay.ts` — a partial run laid over the whole report on disk.
 *
 * Fixtures are hand-built Stryker reports, minimal but shaped like the real thing.
 */
import { describe, expect, it } from 'vitest';
import type { StrykerReport } from '../../../../scripts/mutation/overlay';
import { overlayReport, renderHtml } from '../../../../scripts/mutation/overlay';

/** The one test file every fixture's tests live in. */
const TEST_FILE = 'tests/a.spec.ts';

/** A mutant with `status`, covered by the test ids in `coveredBy`. */
const mutant = (id: string, status: string, coveredBy: string[] = []) => ({
    id,
    mutatorName: 'ConditionalExpression',
    status,
    location: { start: { line: 1, column: 1 }, end: { line: 1, column: 9 } },
    coveredBy
});

/** A report of `files`, each `[file, mutants]`, with one test file holding `[id, name]` tests. */
const reportOf = (
    files: [string, ReturnType<typeof mutant>[]][],
    tests: [string, string][] = []
): StrykerReport => ({
    schemaVersion: '1.0',
    files: Object.fromEntries(files.map(([file, mutants]) => [file, { mutants }])),
    testFiles: {
        [TEST_FILE]: {
            tests: tests.map(([id, name], index) => ({
                id,
                name,
                location: { start: { line: index + 1, column: 1 } }
            }))
        }
    }
});

/** Every mutant of `file` in `merged`. */
const mutantsOf = (merged: StrykerReport, file: string) => merged.files[file].mutants;

/** The name of the test `id` stands for in `merged`. */
const testName = (merged: StrykerReport, id: string | undefined) =>
    merged.testFiles?.[TEST_FILE].tests.find((test) => test.id === id)?.name;

describe('overlayReport', () => {
    it('takes the files the partial run measured from it, and every other file from the whole', () => {
        const whole = reportOf([
            ['src/a.ts', [mutant('0', 'Survived')]],
            ['src/b.ts', [mutant('1', 'NoCoverage')]]
        ]);
        const partial = reportOf([['src/a.ts', [mutant('0', 'Killed')]]]);

        const merged = overlayReport(whole, partial);

        expect(mutantsOf(merged, 'src/a.ts').map(({ status }) => status)).toEqual(['Killed']);
        expect(mutantsOf(merged, 'src/b.ts').map(({ status }) => status)).toEqual(['NoCoverage']);
    });

    it('keeps each mutant pointing at its own test when both reports numbered a test 0', () => {
        const whole = reportOf(
            [['src/b.ts', [mutant('0', 'Survived', ['0'])]]],
            [['0', 'an old test']]
        );
        const partial = reportOf(
            [['src/a.ts', [mutant('0', 'Survived', ['0'])]]],
            [['0', 'a new test']]
        );

        const merged = overlayReport(whole, partial);

        expect(testName(merged, mutantsOf(merged, 'src/b.ts')[0].coveredBy?.[0])).toBe(
            'an old test'
        );
        expect(testName(merged, mutantsOf(merged, 'src/a.ts')[0].coveredBy?.[0])).toBe(
            'a new test'
        );
    });

    it('gives every mutant its own id, though both reports started counting at 0', () => {
        const whole = reportOf([['src/b.ts', [mutant('0', 'Killed')]]]);
        const partial = reportOf([['src/a.ts', [mutant('0', 'Killed')]]]);

        const ids = Object.values(overlayReport(whole, partial).files).flatMap(({ mutants }) =>
            mutants.map(({ id }) => id)
        );

        expect(new Set(ids).size).toBe(2);
    });
});

describe('renderHtml', () => {
    const template = ['<script>', '      app.report = {"old":true};', '</script>'].join('\n');

    it("swaps the report into Stryker's page, escaped the way Stryker escapes it", () => {
        const html = renderHtml(template, { files: {}, note: '</script>' });

        expect(html).toContain('      app.report = {"files":{},"note":"<"+"/script>"};');
        expect(html).not.toContain('"old"');
    });

    it('fails loudly when a Stryker upgrade changed the page', () => {
        expect(() => renderHtml('<html></html>', { files: {} })).toThrow(/app\.report/);
    });
});
