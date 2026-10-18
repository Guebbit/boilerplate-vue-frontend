/**
 * @module
 * The browser-safe arithmetic of the design capture: where to scroll, and what is a fixed band.
 *
 * Why:  `design-capture.ts` runs in the browser bundle and `stitch.ts` needs `pngjs`, which
 *       cannot load there. The numbers both halves share live here, free of any image library.
 * Pure: no Cypress, no DOM, no disk.
 */

/**
 * The scroll offsets to shoot a page of `pageHeight` px with a viewport of `viewportHeight` px.
 *
 * Each step advances by what is left after the fixed bands are cut. The last offset is the
 * browser's own maximum (`pageHeight - viewportHeight`), so it overlaps the one before; the
 * stitcher overwrites that overlap with identical rows.
 *
 * @throws {RangeError} when the bands leave no room to advance
 */
export const stepsFor = (
    pageHeight: number,
    viewportHeight: number,
    bandTop: number,
    bandBottom: number
): number[] => {
    const maxScroll = pageHeight - viewportHeight;
    if (maxScroll <= 0) return [0];

    const advance = viewportHeight - bandTop - bandBottom;
    if (advance <= 0)
        throw new RangeError(
            `the fixed bands (${String(bandTop)} + ${String(bandBottom)} px) fill the ${String(viewportHeight)} px viewport`
        );

    const offsets: number[] = [];
    for (let offset = 0; offset < maxScroll; offset += advance) offsets.push(offset);
    offsets.push(maxScroll);
    return offsets;
};

/**
 * A visible `position: fixed` element, as the browser measured it against the viewport.
 */
export interface FixedBox {
    /** A selector a reader can find the element by, for the shot's `fixed` list. */
    selector: string;
    /** Distance from the viewport's top edge, in px. */
    top: number;
    /** Height in px. */
    height: number;
    /** Width in px. */
    width: number;
}

/**
 * What a fixed element is to the stitcher.
 *
 * `band-top` and `band-bottom` repeat in every shot and are cut out; `other` (a toast, a button
 * that floats) is kept in the first shot and hidden for the rest.
 */
export type FixedClass = 'band-top' | 'band-bottom' | 'other';

/**
 * Sorts a fixed element into a band or `other`.
 *
 * A band is at least half the viewport wide and touches the top or the bottom edge. The top edge
 * wins when an element touches both (a full-height overlay is not a band the stitcher can cut,
 * and `other` keeps it out of the arithmetic).
 *
 * @param box - the element's box, relative to the viewport
 * @param viewport - the viewport the shot is taken at
 */
export const classifyFixed = (
    box: FixedBox,
    viewport: { width: number; height: number }
): FixedClass => {
    if (box.width < viewport.width / 2) return 'other';

    const touchesTop = box.top <= 0;
    const touchesBottom = box.top + box.height >= viewport.height;
    if (touchesTop && touchesBottom) return 'other';
    if (touchesTop) return 'band-top';
    if (touchesBottom) return 'band-bottom';
    return 'other';
};

/**
 * The band heights of a page: the tallest top band and the tallest bottom band among its fixed
 * elements, so the cut covers every band at once.
 *
 * @param boxes - every visible fixed element
 * @param viewport - the viewport the shot is taken at
 */
export const bandsOf = (
    boxes: FixedBox[],
    viewport: { width: number; height: number }
): { bandTop: number; bandBottom: number } => {
    let bandTop = 0;
    let bandBottom = 0;
    for (const box of boxes) {
        const kind = classifyFixed(box, viewport);
        if (kind === 'band-top') bandTop = Math.max(bandTop, box.top + box.height);
        if (kind === 'band-bottom') bandBottom = Math.max(bandBottom, viewport.height - box.top);
    }
    return { bandTop, bandBottom };
};
