/**
 * @module
 * The stats domain rules: the period the API will accept, the change figure, CSV escaping, and the
 * Mermaid text a label can never break out of. Pure functions, no DOM.
 */
import { describe, expect, it } from 'vitest';
import {
    autoInterval,
    bucketCount,
    bucketLabel,
    chartTable,
    escapeCsvCell,
    isFlat,
    MAX_BUCKETS,
    percentChange,
    periodFromQuery,
    periodProblem,
    pieChartSource,
    presetPeriod,
    safeLabel,
    toCsv,
    xyChartSource
} from '../domain';
import type { ChartModel } from '../domain';

/** A fixed "today" so every preset is a known range. */
const TODAY = new Date(2026, 9, 12);

describe('periodProblem', () => {
    it('accepts a month of days', () => {
        expect(
            periodProblem({ from: '2026-09-01', to: '2026-09-30', interval: 'day' })
        ).toBeUndefined();
    });

    it('refuses a day that does not exist, and a reversed range', () => {
        expect(periodProblem({ from: '2026-02-30', to: '2026-03-05', interval: 'day' })).toBe(
            'invalid'
        );
        expect(periodProblem({ from: '2026-09-30', to: '2026-09-01', interval: 'day' })).toBe(
            'reversed'
        );
    });

    it('allows exactly two years and refuses a day more', () => {
        expect(
            periodProblem({ from: '2025-01-01', to: '2026-12-31', interval: 'month' })
        ).toBeUndefined();
        expect(periodProblem({ from: '2024-01-01', to: '2026-12-31', interval: 'month' })).toBe(
            'too-long'
        );
    });

    it('refuses a daily series longer than the bucket ceiling', () => {
        expect(periodProblem({ from: '2025-01-01', to: '2026-02-15', interval: 'day' })).toBe(
            'too-many-buckets'
        );
        expect(MAX_BUCKETS).toBe(400);
    });
});

describe('bucketCount', () => {
    it('counts days, partial weeks at both ends, and every month touched', () => {
        expect(bucketCount('2026-10-01', '2026-10-14', 'day')).toBe(14);
        expect(bucketCount('2026-10-01', '2026-10-14', 'week')).toBe(3);
        expect(bucketCount('2026-10-31', '2026-11-01', 'month')).toBe(2);
        expect(bucketCount('2025-11-15', '2026-02-01', 'month')).toBe(4);
    });
});

describe('autoInterval', () => {
    it.each([
        ['2026-10-01', '2026-10-31', 'day'],
        ['2026-10-01', '2026-11-01', 'week'],
        ['2026-01-01', '2026-06-30', 'week'],
        ['2026-01-01', '2026-12-31', 'month']
    ])('%s to %s groups by %s', (from, to, expected) => {
        expect(autoInterval(from, to)).toBe(expected);
    });
});

describe('presetPeriod', () => {
    it('ends today and counts today in the window', () => {
        expect(presetPeriod('last-7', TODAY)).toEqual({
            from: '2026-10-06',
            to: '2026-10-12',
            interval: 'day'
        });
        expect(presetPeriod('last-90', TODAY).from).toBe('2026-07-15');
    });

    it('starts the year on 1 January', () => {
        expect(presetPeriod('this-year', TODAY)).toMatchObject({
            from: '2026-01-01',
            to: '2026-10-12'
        });
    });
});

describe('periodFromQuery', () => {
    it('takes a valid period from the URL', () => {
        expect(
            periodFromQuery({ from: '2026-09-01', to: '2026-09-07', interval: 'week' }, TODAY)
        ).toEqual({ from: '2026-09-01', to: '2026-09-07', interval: 'week' });
    });

    it('falls back to the last 30 days for a missing, malformed or impossible one', () => {
        const fallback = presetPeriod('last-30', TODAY);
        expect(periodFromQuery({}, TODAY)).toEqual(fallback);
        expect(periodFromQuery({ from: 'x', to: 'y' }, TODAY)).toEqual(fallback);
        expect(periodFromQuery({ from: '2026-09-09', to: '2026-09-01' }, TODAY)).toEqual(fallback);
    });

    it('ignores an unknown interval but keeps the days', () => {
        expect(
            periodFromQuery({ from: '2026-09-01', to: '2026-09-07', interval: 'hour' }, TODAY)
        ).toEqual({ from: '2026-09-01', to: '2026-09-07', interval: 'day' });
    });
});

describe('percentChange', () => {
    it('is a fraction of the previous figure', () => {
        expect(percentChange(110, 100)).toBeCloseTo(0.1);
        expect(percentChange(50, 100)).toBeCloseTo(-0.5);
    });

    it('is undefined with nothing to compare against', () => {
        expect(percentChange(10, 0)).toBeUndefined();
    });

    it('reads a drop from a negative figure against its size', () => {
        expect(percentChange(-50, -100)).toBeCloseTo(0.5);
    });
});

describe('isFlat', () => {
    it('is true only below a twentieth of a percent', () => {
        expect(isFlat(0.0004)).toBe(true);
        expect(isFlat(-0.0004)).toBe(true);
        expect(isFlat(0.001)).toBe(false);
    });
});

describe('escapeCsvCell', () => {
    it.each(['=SUM(A1)', '+1', '-1', '@cmd', '\tx', '\rx'])(
        'neutralises the formula start %j',
        (cell) => {
            expect(escapeCsvCell(cell)).toMatch(/^"?'/);
        }
    );

    it('leaves a number alone, even a negative one', () => {
        expect(escapeCsvCell(-12.5)).toBe('-12.5');
    });

    it('quotes a cell with a comma, a quote or a line break', () => {
        expect(escapeCsvCell('a,b')).toBe('"a,b"');
        expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
        expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
    });

    it('writes nothing for an absent or non-finite value', () => {
        expect(escapeCsvCell(undefined)).toBe('');
        expect(escapeCsvCell(Number.NaN)).toBe('');
    });
});

describe('toCsv', () => {
    it('joins rows with CRLF and cells with commas', () => {
        expect(
            toCsv(
                ['a', 'b'],
                [
                    [1, 'x'],
                    [2, '=y']
                ]
            )
        ).toBe("a,b\r\n1,x\r\n2,'=y");
    });
});

describe('safeLabel', () => {
    it('keeps letters of any script, digits and plain marks', () => {
        expect(safeLabel("Gatto 5 kg (bio) - O'Neil & Co.")).toBe(
            "Gatto 5 kg (bio) - O'Neil & Co."
        );
        expect(safeLabel('猫粮')).toBe('猫粮');
    });

    it('removes everything that could close a quote or open a directive', () => {
        const cleaned = safeLabel('x"] \n%%{init: {}}%% <img src=x onerror=1>; #35; \\');
        expect(cleaned).not.toMatch(/[\n"#%;<>[\\\]{}]/);
    });

    it('cuts a long label with an ellipsis', () => {
        const cleaned = safeLabel('a'.repeat(80));
        expect(cleaned).toHaveLength(32);
        expect(cleaned.endsWith('…')).toBe(true);
    });
});

/** A two-series chart over three labels, one of them hostile. */
const CHART: ChartModel = {
    title: 'Sales "title"',
    labels: ['1 Oct', '2 Oct', 'x"]; pie'],
    yTitle: 'EUR',
    series: [
        { name: 'Total', kind: 'bar', values: [1.234, 2, Number.NaN] },
        { name: 'Orders', kind: 'line', values: [1, 2, 3] }
    ]
};

describe('xyChartSource', () => {
    it('declares the axes and one statement per series, in order', () => {
        const lines = xyChartSource(CHART).split('\n');
        expect(lines[0]).toBe('xychart-beta');
        expect(lines).toContain('    bar [1.23, 2, 0]');
        expect(lines).toContain('    line [1, 2, 3]');
        expect(lines.filter((line) => line.startsWith('    x-axis'))).toHaveLength(1);
    });

    it('lets no label add a line of its own', () => {
        const source = xyChartSource(CHART);
        expect(source.split('\n')).toHaveLength(6);
        expect(source.split('\n')[2]).toBe('    x-axis ["1 Oct", "2 Oct", "x pie"]');
    });
});

describe('pieChartSource', () => {
    it('reads the first series and drops slices that are not positive', () => {
        const source = pieChartSource({
            title: 'Mix',
            labels: ['Card', 'Cash', 'Other'],
            series: [{ name: 'n', kind: 'bar', values: [3, 0, -1] }]
        });
        expect(source).toBe('pie showData title Mix\n    "Card" : 3');
    });
});

describe('chartTable', () => {
    it('is the label then one column per series', () => {
        expect(chartTable(CHART, 'Day')).toEqual({
            header: ['Day', 'Total', 'Orders'],
            rows: [
                ['1 Oct', 1.234, 1],
                ['2 Oct', 2, 2],
                ['x"]; pie', Number.NaN, 3]
            ]
        });
    });
});

describe('bucketLabel', () => {
    it('reads a bucket in the shop zone, not the browser zone', () => {
        // 22:00 UTC on 11 Oct is already 12 Oct in Rome (UTC+2), so the bucket is the 12th.
        expect(bucketLabel('2026-10-11T22:00:00.000Z', 'Europe/Rome', 'day', 'en')).toBe('Oct 12');
        expect(bucketLabel('2026-10-11T22:00:00.000Z', 'UTC', 'day', 'en')).toBe('Oct 11');
    });

    it('shows month and year for a month bucket', () => {
        expect(bucketLabel('2026-09-30T22:00:00.000Z', 'Europe/Rome', 'month', 'en')).toBe(
            'Oct 2026'
        );
    });
});
