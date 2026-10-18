/**
 * @module
 * The pure half of the design capture: scroll offsets, the stitcher and the tile cutter.
 *
 * Why:      a long page cannot be shot in one frame, and a model shrinks a tile that is too big.
 * Pure:     no Cypress, no browser, no disk. Cypress' Node tasks call these with PNG buffers.
 * Pipeline: `stepsFor` (offsets) → browser shoots each → `stitchSegments` → `cutTiles`.
 */
import { PNG } from 'pngjs';

/**
 * The longest edge of a tile, in px.
 *
 * Anthropic's vision docs scale an image down past 1568 px on the long edge on models before
 * Opus 4.7; newer models take 2576 px. The lower limit stays on purpose (checked 2026-10-18): a
 * tile under it is read at full size by every model, and tokens follow area, so bigger tiles
 * save Read calls only. https://platform.claude.com/docs/en/build-with-claude/vision
 */
export const MAX_TILE_EDGE = 1560;

/**
 * The most pixels a tile may hold (about 1.15 MP), the second limit of the same rule.
 * Same date, same reason as {@link MAX_TILE_EDGE}.
 */
export const MAX_TILE_PIXELS = 1_150_000;

/**
 * How many rows two neighbouring tiles share, so an element on a cut is whole in at least one.
 */
export const TILE_OVERLAP = 40;

/**
 * One shot of the viewport, taken at a known scroll position.
 */
export interface Segment {
    /** The PNG of the viewport at that moment; its height is the viewport height. */
    png: PNG;
    /** The scroll position the browser actually reported, not the one asked for. */
    scrollY: number;
}

/**
 * What {@link stitchSegments} needs besides the shots.
 */
export interface StitchInput {
    /** The shots, top to bottom. The last may overlap the one before (the browser clamps it). */
    segments: Segment[];
    /** Rows of fixed chrome at the top of every shot (an app bar), cut from all but the first. */
    bandTop: number;
    /** Rows of fixed chrome at the bottom of every shot, cut from all but the last. */
    bandBottom: number;
    /** The full document height, which becomes the canvas height. */
    pageHeight: number;
}

/**
 * One slice of a stitched page.
 */
export interface Tile {
    /** The slice itself. */
    png: PNG;
    /** Where the slice starts on the stitched page, in px. */
    offsetY: number;
}

/**
 * The largest tile height for a given width: the lower of the edge cap and the pixel cap.
 *
 * Phone 390 → 1560, tablet 1024 → 1123, desktop 1280 → 898.
 */
export const tileHeightFor = (width: number): number =>
    Math.min(MAX_TILE_EDGE, Math.floor(MAX_TILE_PIXELS / width));

/**
 * Copies `height` rows of `source`, starting at `sourceY`, onto `canvas` at `canvasY`.
 * Rows that would fall outside the canvas are dropped.
 */
const copyRows = (
    source: PNG,
    canvas: PNG,
    sourceY: number,
    height: number,
    canvasY: number
): void => {
    const rows = Math.min(height, canvas.height - canvasY);
    if (rows <= 0) return;
    // pngjs `PNG.bitblt(src, dst, srcX, srcY, width, height, deltaX, deltaY)`: copies a pixel
    // rectangle between two images. srcX/srcY are the rectangle's corner in the source,
    // width/height its size, deltaX/deltaY where it lands in the destination.
    // https://github.com/pngjs/pngjs#pngbitbltsrc-dst-srcx-srcy-width-height-deltax-deltay
    PNG.bitblt(source, canvas, 0, sourceY, source.width, rows, 0, canvasY);
};

/**
 * Lays the shots onto one tall canvas at their real scroll positions.
 *
 * The top band is cut from every shot but the first, the bottom band from every shot but the
 * last, so a fixed app bar appears once at the top and a fixed footer once at the bottom.
 */
export const stitchSegments = ({ segments, bandTop, bandBottom, pageHeight }: StitchInput): PNG => {
    const first = segments.at(0);
    if (!first) throw new RangeError('nothing to stitch: no segments');

    const canvas = new PNG({ width: first.png.width, height: pageHeight });
    const lastIndex = segments.length - 1;

    for (const [index, { png, scrollY }] of segments.entries()) {
        const fromRow = index === 0 ? 0 : bandTop;
        const toRow = index === lastIndex ? png.height : png.height - bandBottom;
        copyRows(png, canvas, fromRow, toRow - fromRow, scrollY + fromRow);
    }

    return canvas;
};

/**
 * Cuts a stitched page into tiles of at most `maxHeight` rows, top to bottom.
 *
 * Neighbours share exactly `overlap` rows. A page no taller than `maxHeight` is one tile.
 *
 * @throws {RangeError} when `maxHeight` is not larger than `overlap`
 */
export const cutTiles = (page: PNG, maxHeight: number, overlap = TILE_OVERLAP): Tile[] => {
    if (maxHeight <= overlap)
        throw new RangeError(
            `a tile of ${String(maxHeight)} rows cannot overlap by ${String(overlap)}`
        );

    const tiles: Tile[] = [];
    let offsetY = 0;

    for (;;) {
        const height = Math.min(maxHeight, page.height - offsetY);
        const png = new PNG({ width: page.width, height });
        // The tile is the page rectangle [offsetY, offsetY + height), copied to the tile's origin.
        PNG.bitblt(page, png, 0, offsetY, page.width, height, 0, 0);
        tiles.push({ png, offsetY });

        if (offsetY + height >= page.height) return tiles;
        offsetY += height - overlap;
    }
};
