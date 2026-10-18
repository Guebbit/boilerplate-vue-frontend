/**
 * @module
 * The Node half of `cy.captureDesign()`: stitch the shots into tiles, and keep the manifest rows.
 *
 * Why:  the browser cannot read the screenshots Cypress wrote nor write the tiles. Both are
 *       `cy.task`s registered in `cypress.config.ts`, called from `design-capture.ts`.
 * Disk: tiles go to `reports/audit/design-manual/capture/<shot-id>/`, rows to `parts/<spec>.jsonl`.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { CAPTURE_DIR, type DesignShot, type DesignTile } from './manifest';
import { cutTiles, stitchSegments, tileHeightFor } from './stitch';

/**
 * One viewport shot Cypress wrote, and where the page was scrolled to when it was taken.
 */
export interface StitchSegmentRequest {
    /** Absolute path of the PNG, as Cypress reported it. */
    path: string;
    /** The scroll position the browser reported. */
    scrollY: number;
}

/**
 * What the stitch task is asked to do.
 */
export interface StitchRequest {
    /** The shot's stable id: the folder its tiles land in. */
    shotId: string;
    /** The shots, top to bottom. */
    segments: StitchSegmentRequest[];
    /** Rows of fixed chrome at the top of every shot. */
    bandTop: number;
    /** Rows of fixed chrome at the bottom of every shot. */
    bandBottom: number;
    /** The full scroll height of the page. */
    pageHeight: number;
}

/**
 * Anthropic's estimate of the image tokens a tile costs: width × height / 750.
 *
 * @param width - tile width in px
 * @param height - tile height in px
 */
export const estimatedTokensOf = (width: number, height: number): number =>
    Math.ceil((width * height) / 750);

/**
 * Stitches a shot's segments into one page and writes it as model-sized tiles.
 *
 * @param request - the segments and the page geometry
 * @param root - where the repo is; tile paths come back relative to it
 * @returns The tiles, top to bottom, with repo-relative paths
 */
export const stitchDesignCapture = (request: StitchRequest, root = process.cwd()): DesignTile[] => {
    const segments = request.segments.map(({ path: file, scrollY }) => ({
        png: PNG.sync.read(readFileSync(file)),
        scrollY
    }));

    const page = stitchSegments({
        segments,
        bandTop: request.bandTop,
        bandBottom: request.bandBottom,
        pageHeight: request.pageHeight
    });

    const folder = path.join(CAPTURE_DIR, request.shotId);
    mkdirSync(path.join(root, folder), { recursive: true });

    return cutTiles(page, tileHeightFor(page.width)).map(({ png, offsetY }, index) => {
        const file = path.join(folder, `tile-${String(index + 1)}.png`);
        writeFileSync(path.join(root, file), PNG.sync.write(png));
        return {
            path: file,
            width: png.width,
            height: png.height,
            offsetY,
            estimatedTokens: estimatedTokensOf(png.width, png.height)
        };
    });
};

/**
 * What the record task is asked to keep.
 */
export interface RecordShotRequest {
    /** The spec's slug: the part file it appends to. One writer per spec, so no races. */
    spec: string;
    /** The row. */
    shot: DesignShot;
}

/**
 * Appends a shot to its spec's part file, replacing an earlier row with the same id (a retried
 * test shoots the same screen again).
 *
 * @param request - the spec and the row
 * @param root - where the repo is
 * @returns The part file written, because a task must return something serialisable
 */
export const recordDesignShot = (request: RecordShotRequest, root = process.cwd()): string => {
    const directory = path.join(root, CAPTURE_DIR, 'parts');
    mkdirSync(directory, { recursive: true });
    const file = path.join(directory, `${request.spec}.jsonl`);

    const kept = existsSync(file)
        ? readFileSync(file, 'utf8')
              .split('\n')
              .filter((line) => line !== '')
              .filter((line) => (JSON.parse(line) as { id: string }).id !== request.shot.id)
        : [];
    writeFileSync(file, `${[...kept, JSON.stringify(request.shot)].join('\n')}\n`);
    return file;
};
