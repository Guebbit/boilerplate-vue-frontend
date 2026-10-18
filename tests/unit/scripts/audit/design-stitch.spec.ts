/**
 * `scripts/audit/design-manual/scripts/stitch.ts` — a long page becomes one image, then tiles.
 */
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import {
    bandsOf,
    classifyFixed,
    stepsFor
} from '../../../../scripts/audit/design-manual/scripts/bands';
import {
    cutTiles,
    MAX_TILE_EDGE,
    stitchSegments,
    tileHeightFor
} from '../../../../scripts/audit/design-manual/scripts/stitch';

/** A PNG of one flat colour, so a row's origin can be read back from its pixels. */
const flat = (width: number, height: number, rgb: [number, number, number]): PNG => {
    const png = new PNG({ width, height });
    for (let index = 0; index < width * height; index += 1) {
        png.data[index * 4] = rgb[0];
        png.data[index * 4 + 1] = rgb[1];
        png.data[index * 4 + 2] = rgb[2];
        png.data[index * 4 + 3] = 255;
    }
    return png;
};

/** The red channel of the pixel at the start of `row`. */
const redAt = (png: PNG, row: number): number => png.data[row * png.width * 4] ?? -1;

/** The blue channel of the pixel at the start of `row`: 1 on the top band, 2 on the bottom band. */
const blueAt = (png: PNG, row: number): number => png.data[row * png.width * 4 + 2] ?? -1;

/**
 * A viewport shot as a browser would take it: a red top band, a blue bottom band, and between
 * them page content whose red channel is the page row it shows (row / 4, so it fits a byte).
 */
const shot = (
    scrollY: number,
    viewportHeight: number,
    bandTop: number,
    bandBottom: number
): PNG => {
    const png = flat(4, viewportHeight, [0, 0, 0]);
    for (let row = 0; row < viewportHeight; row += 1) {
        const inTop = row < bandTop;
        const inBottom = row >= viewportHeight - bandBottom;
        png.data[row * 16] = inTop ? 250 : inBottom ? 10 : Math.floor((scrollY + row) / 4);
        png.data[row * 16 + 2] = inTop ? 1 : inBottom ? 2 : 0;
    }
    return png;
};

describe('stepsFor', () => {
    it('ends exactly at the browser’s own maximum scroll', () => {
        const steps = stepsFor(2000, 800, 56, 0);

        expect(steps.at(-1)).toBe(2000 - 800);
        expect(steps[0]).toBe(0);
    });

    it('advances by what the bands leave of the viewport', () => {
        expect(stepsFor(3000, 800, 56, 44).slice(0, 3)).toEqual([0, 700, 1400]);
    });

    it('gives one step to a page that fits', () => {
        expect(stepsFor(700, 800, 56, 0)).toEqual([0]);
    });

    it('refuses bands that fill the viewport', () => {
        expect(() => stepsFor(3000, 800, 400, 400)).toThrow(RangeError);
    });

    it('leaves no row of the page uncovered', () => {
        const [viewport, bandTop, bandBottom, page] = [800, 56, 44, 2650] as const;
        const steps = stepsFor(page, viewport, bandTop, bandBottom);
        const covered = new Set<number>();
        for (const [index, scrollY] of steps.entries()) {
            const from = index === 0 ? 0 : bandTop;
            const to = index === steps.length - 1 ? viewport : viewport - bandBottom;
            for (let row = from; row < to; row += 1) covered.add(scrollY + row);
        }

        for (let row = 0; row < page; row += 1) expect(covered.has(row)).toBe(true);
    });
});

describe('stitchSegments', () => {
    const [viewport, bandTop, bandBottom, pageHeight] = [200, 20, 10, 530] as const;
    const steps = stepsFor(pageHeight, viewport, bandTop, bandBottom);
    const page = stitchSegments({
        segments: steps.map((scrollY) => ({
            png: shot(scrollY, viewport, bandTop, bandBottom),
            scrollY
        })),
        bandTop,
        bandBottom,
        pageHeight
    });

    it('gives the canvas the height of the page', () => {
        expect(page.height).toBe(pageHeight);
    });

    it('keeps the top band once, at the top', () => {
        const red = Array.from({ length: pageHeight }, (_, row) => blueAt(page, row) === 1);

        expect(red.slice(0, bandTop).every(Boolean)).toBe(true);
        expect(red.slice(bandTop).some(Boolean)).toBe(false);
    });

    it('keeps the bottom band once, at the bottom', () => {
        const blue = Array.from({ length: pageHeight }, (_, row) => blueAt(page, row) === 2);

        expect(blue.slice(pageHeight - bandBottom).every(Boolean)).toBe(true);
        expect(blue.slice(0, pageHeight - bandBottom).some(Boolean)).toBe(false);
    });

    it('puts every content row where the page has it', () => {
        for (let row = bandTop; row < pageHeight - bandBottom; row += 1)
            expect(redAt(page, row)).toBe(Math.floor(row / 4));
    });

    it('returns a one-segment page unchanged', () => {
        const only = flat(4, 100, [7, 8, 9]);
        const stitched = stitchSegments({
            segments: [{ png: only, scrollY: 0 }],
            bandTop: 20,
            bandBottom: 10,
            pageHeight: 100
        });

        expect(stitched.data.equals(only.data)).toBe(true);
    });

    it('refuses an empty run', () => {
        expect(() =>
            stitchSegments({ segments: [], bandTop: 0, bandBottom: 0, pageHeight: 10 })
        ).toThrow(RangeError);
    });
});

/** A page whose red channel counts its rows, so a tile’s origin can be read back. */
const counting = (height: number): PNG => {
    const png = flat(2, height, [0, 0, 0]);
    for (let row = 0; row < height; row += 1) png.data[row * 8] = row % 251;
    return png;
};

describe('cutTiles', () => {
    it('cuts no tile taller than the limit', () => {
        const tiles = cutTiles(counting(1000), 300, 40);

        expect(tiles.every(({ png }) => png.height <= 300)).toBe(true);
    });

    it('shares exactly the overlap between neighbours', () => {
        const tiles = cutTiles(counting(1000), 300, 40);

        for (const [index, { offsetY }] of tiles.slice(1).entries()) {
            const previous = tiles.at(index);
            expect(previous && previous.offsetY + previous.png.height - offsetY).toBe(40);
        }
    });

    it('starts each tile on the page row its offset names', () => {
        for (const { png, offsetY } of cutTiles(counting(1000), 300, 40))
            expect(redAt(png, 0)).toBe(offsetY % 251);
    });

    it('ends the last tile at the bottom of the page', () => {
        const tiles = cutTiles(counting(1000), 300, 40);
        const last = tiles.at(-1);

        expect(last && last.offsetY + last.png.height).toBe(1000);
    });

    it('keeps a page that fits as one tile', () => {
        expect(cutTiles(counting(250), 300, 40)).toHaveLength(1);
    });

    it('refuses a limit it cannot overlap within', () => {
        expect(() => cutTiles(counting(500), 40, 40)).toThrow(RangeError);
    });
});

describe('tileHeightFor', () => {
    it('caps a phone at the edge limit', () => {
        expect(tileHeightFor(390)).toBe(MAX_TILE_EDGE);
        expect(tileHeightFor(390)).toBe(1560);
    });

    it('caps a tablet and a desktop by their pixel budget', () => {
        expect(tileHeightFor(1024)).toBe(1123);
        expect(tileHeightFor(1280)).toBe(898);
    });
});

describe('classifyFixed', () => {
    const phone = { width: 390, height: 844 };

    it('calls a wide element on the top edge a top band', () => {
        expect(classifyFixed({ selector: '.bar', top: 0, height: 56, width: 390 }, phone)).toBe(
            'band-top'
        );
    });

    it('calls a wide element on the bottom edge a bottom band', () => {
        expect(classifyFixed({ selector: '.nav', top: 788, height: 56, width: 390 }, phone)).toBe(
            'band-bottom'
        );
    });

    it('leaves a narrow element, a toast or a floating button, as other', () => {
        expect(classifyFixed({ selector: '.toast', top: 0, height: 48, width: 120 }, phone)).toBe(
            'other'
        );
        expect(classifyFixed({ selector: '.fab', top: 760, height: 56, width: 56 }, phone)).toBe(
            'other'
        );
    });

    it('leaves a wide element away from both edges as other', () => {
        expect(classifyFixed({ selector: '.strip', top: 300, height: 40, width: 390 }, phone)).toBe(
            'other'
        );
    });

    it('does not treat a full-height overlay as a band', () => {
        expect(classifyFixed({ selector: '.scrim', top: 0, height: 844, width: 390 }, phone)).toBe(
            'other'
        );
    });
});

describe('bandsOf', () => {
    it('takes the tallest band on each edge and ignores the rest', () => {
        const phone = { width: 390, height: 844 };

        expect(
            bandsOf(
                [
                    { selector: '.bar', top: 0, height: 56, width: 390 },
                    { selector: '.banner', top: 0, height: 80, width: 390 },
                    { selector: '.cookie', top: 764, height: 80, width: 390 },
                    { selector: '.toast', top: 20, height: 40, width: 100 }
                ],
                phone
            )
        ).toEqual({ bandTop: 80, bandBottom: 80 });
    });

    it('is zero for a page with no fixed chrome', () => {
        expect(bandsOf([], { width: 1280, height: 800 })).toEqual({ bandTop: 0, bandBottom: 0 });
    });
});
