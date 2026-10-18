/**
 * @module
 * The guard that keeps a clamped screenshot out of the baselines.
 */

/** A pixel size. */
export interface ShotSize {
    width: number;
    height: number;
}

/**
 * Says why a screenshot cannot stand for its viewport, or `undefined` when it can.
 *
 * `actual` is the PNG; `expected` is the page's own `innerWidth` × `innerHeight`. A smaller shot
 * means the browser window clipped it; an exactly doubled one means a device pixel ratio of 2.
 * Run before any baseline logic, update mode included, so neither can be recorded.
 */
export const shotSizeProblem = (actual: ShotSize, expected: ShotSize): string | undefined => {
    if (actual.width === expected.width && actual.height === expected.height) return undefined;

    const shot = `${String(actual.width)}x${String(actual.height)}`;
    const viewport = `${String(expected.width)}x${String(expected.height)}`;

    if (actual.width === expected.width * 2 && actual.height === expected.height * 2)
        return `the shot is ${shot} but the viewport is ${viewport}: the device pixel ratio is 2, and a baseline must be recorded at 1`;

    return `the shot is ${shot} but the viewport is ${viewport}: the browser window is smaller than the viewport (see scripts/e2e/browser-launch.ts)`;
};
