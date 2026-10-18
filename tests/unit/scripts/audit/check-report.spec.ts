/**
 * `scripts/audit/design-manual/scripts/check-report.ts` — an invented citation is caught, not trusted.
 */
import { describe, expect, it } from 'vitest';
import {
    type CitationSources,
    checkReport
} from '../../../../scripts/audit/design-manual/scripts/check-report';

const sources: CitationSources = {
    manifestTiles: new Set(['reports/t/orders--list--phone--light-0.png', 'reports/t/gone.png']),
    fileExists: (file) => file !== 'reports/t/gone.png',
    lineCount: (file) => (file === 'src/views/Orders.vue' ? 120 : undefined)
};

const HEADER =
    '| id | item | screen | tile | source file:line | severity | verdict | finding | fix |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';

/** A findings table with one row, every cell valid unless `over` replaces it. */
const table = (
    over: Partial<Record<'tile' | 'source' | 'item' | 'severity' | 'fix', string>> = {}
): string => {
    const cell = {
        tile: 'reports/t/orders--list--phone--light-0.png',
        source: 'src/views/Orders.vue:42',
        item: 'D1',
        severity: 'S2',
        fix: 'make the save button filled',
        ...over
    };
    return `${HEADER}| F1 | ${cell.item} | orders · phone | ${cell.tile} | ${cell.source} | ${cell.severity} | CONFIRMED | two primaries | ${cell.fix} |\n`;
};

describe('checkReport', () => {
    it('passes a valid row', () => {
        expect(checkReport(table(), sources)).toEqual({ checked: 1, failures: [] });
    });

    it('fails a tile the manifest does not list', () => {
        const { failures } = checkReport(table({ tile: 'reports/t/made-up.png' }), sources);

        expect(failures).toEqual([
            { row: 'F1', column: 'tile', reason: 'reports/t/made-up.png is not in the manifest' }
        ]);
    });

    it('fails a tile that is listed but not on disk', () => {
        const { failures } = checkReport(table({ tile: 'reports/t/gone.png' }), sources);

        expect(failures[0]?.reason).toBe('reports/t/gone.png is in the manifest but not on disk');
    });

    it('fails a line past the end of the file', () => {
        const { failures } = checkReport(table({ source: 'src/views/Orders.vue:121' }), sources);

        expect(failures[0]).toMatchObject({ column: 'source' });
        expect(failures[0]?.reason).toContain('120 lines');
    });

    it('fails a file that does not exist', () => {
        const { failures } = checkReport(table({ source: 'src/views/Nope.vue:3' }), sources);

        expect(failures[0]?.reason).toBe('src/views/Nope.vue does not exist');
    });

    it('accepts a line range inside the file and fails one that runs past it', () => {
        expect(
            checkReport(table({ source: 'src/views/Orders.vue:40-60' }), sources).failures
        ).toEqual([]);
        expect(
            checkReport(table({ source: 'src/views/Orders.vue:100-130' }), sources).failures
        ).toHaveLength(1);
    });

    it('fails a citation that is not file:line', () => {
        expect(checkReport(table({ source: 'Orders.vue' }), sources).failures[0]?.column).toBe(
            'source'
        );
    });

    it('fails an item outside the checklist', () => {
        expect(checkReport(table({ item: 'D17' }), sources).failures[0]?.column).toBe('item');
    });

    it('accepts a reviewer-added item that names its anchor', () => {
        const added = '+ Skeleton shape — NN/g heuristic 1';

        expect(checkReport(table({ item: added }), sources).failures).toEqual([]);
        expect(checkReport(table({ item: '+ Skeleton shape' }), sources).failures[0]?.column).toBe(
            'item'
        );
    });

    it('fails a severity outside S1–S3 and an empty fix', () => {
        const columns = checkReport(table({ severity: 'S4', fix: ' — ' }), sources).failures.map(
            ({ column }) => column
        );

        expect(columns).toEqual(['severity', 'fix']);
    });

    it('reads a path wrapped in backticks', () => {
        const wrapped = table({
            tile: '`reports/t/orders--list--phone--light-0.png`',
            source: '`src/views/Orders.vue:42`'
        });

        expect(checkReport(wrapped, sources).failures).toEqual([]);
    });

    it('ignores prose and tables that are not findings tables', () => {
        const markdown = `Counts first.\n\n| shots | tiles |\n| --- | --- |\n| 4 | 9 |\n\n${table()}`;

        expect(checkReport(markdown, sources)).toEqual({ checked: 1, failures: [] });
    });

    it('fails a report whose only table has no tile and severity columns', () => {
        const { failures } = checkReport('| shots | tiles |\n| --- | --- |\n| 4 | 9 |\n', sources);

        expect(failures).toEqual([
            {
                row: 'table',
                column: 'table',
                reason: 'no findings table with tile and severity columns'
            }
        ]);
    });

    it('passes a report with no findings and says it checked none', () => {
        expect(checkReport('No findings.\n', sources)).toEqual({ checked: 0, failures: [] });
    });

    it('checks every row, not only the first', () => {
        const two = `${table()}| F2 | D3 | orders | reports/t/made-up.png | src/views/Orders.vue:1 | S3 | CONFIRMED | x | y |\n`;

        expect(checkReport(two, sources)).toMatchObject({
            checked: 2,
            failures: [{ row: 'F2', column: 'tile' }]
        });
    });
});
