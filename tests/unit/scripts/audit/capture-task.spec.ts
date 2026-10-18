/**
 * `scripts/audit/design-manual/scripts/capture-task.ts` — the Node half of `cy.captureDesign()`.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DesignShot } from '../../../../scripts/audit/design-manual/scripts/manifest';
import {
    estimatedTokensOf,
    recordDesignShot,
    stitchDesignCapture
} from '../../../../scripts/audit/design-manual/scripts/capture-task';

/** A scratch repo root for the tiles and rows the tasks write. */
let root = '';

beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'capture-task-'));
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

/** Writes a flat PNG to the scratch root and returns its path. */
const writePng = (name: string, width: number, height: number): string => {
    const png = new PNG({ width, height });
    png.data.fill(255);
    const file = path.join(root, name);
    writeFileSync(file, PNG.sync.write(png));
    return file;
};

/** A minimal row. */
const rowOf = (id: string): DesignShot => ({
    id,
    module: 'cart',
    spec: 'src/modules/cart/tests/e2e/a11y.cy.ts',
    caseName: 'Cart',
    route: '/en/cart',
    role: 'anonymous',
    viewport: 'phone',
    size: [390, 844],
    touch: true,
    theme: 'light',
    locale: 'en',
    state: 'first-paint',
    tiles: [],
    page: {
        height: 844,
        scrollWidth: 390,
        clientWidth: 390,
        bandTop: 0,
        bandBottom: 0,
        stickyRepeats: false
    },
    fixed: [],
    inputs: [],
    headings: []
});

describe('stitchDesignCapture', () => {
    it('writes one tile for a page that fits and one more past the limit', () => {
        const one = stitchDesignCapture(
            {
                shotId: 'a--phone--light',
                segments: [{ path: writePng('s0.png', 390, 844), scrollY: 0 }],
                bandTop: 0,
                bandBottom: 0,
                pageHeight: 844
            },
            root
        );
        expect(one).toHaveLength(1);
        expect(one[0]).toMatchObject({ width: 390, height: 844, offsetY: 0 });
        expect(one[0]?.path).toBe('reports/audit/design-manual/capture/a--phone--light/tile-1.png');
        expect(PNG.sync.read(readFileSync(path.join(root, one[0]?.path ?? ''))).height).toBe(844);

        const tall = stitchDesignCapture(
            {
                shotId: 'b--phone--light',
                segments: [
                    { path: writePng('t0.png', 390, 844), scrollY: 0 },
                    { path: writePng('t1.png', 390, 844), scrollY: 844 },
                    { path: writePng('t2.png', 390, 844), scrollY: 1688 }
                ],
                bandTop: 0,
                bandBottom: 0,
                pageHeight: 2532
            },
            root
        );
        expect(tall.length).toBeGreaterThan(1);
        expect(Math.max(...tall.map(({ height }) => height))).toBeLessThanOrEqual(1560);
    });
});

describe('recordDesignShot', () => {
    it('appends rows and replaces a retried one by id', () => {
        const file = recordDesignShot({ spec: 'cart', shot: rowOf('one') }, root);
        recordDesignShot({ spec: 'cart', shot: rowOf('two') }, root);
        recordDesignShot({ spec: 'cart', shot: { ...rowOf('one'), caseName: 'Again' } }, root);

        const rows = readFileSync(file, 'utf8')
            .split('\n')
            .filter((line) => line !== '')
            .map((line) => JSON.parse(line) as DesignShot);
        expect(rows.map(({ id }) => id)).toEqual(['two', 'one']);
        expect(rows.at(-1)?.caseName).toBe('Again');
    });
});

describe('estimatedTokensOf', () => {
    it('follows width × height / 750, rounded up', () => {
        expect(estimatedTokensOf(390, 1560)).toBe(812);
    });
});
