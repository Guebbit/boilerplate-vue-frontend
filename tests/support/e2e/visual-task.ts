/**
 * The image comparison behind `cy.compareSnapshot()`.
 *
 * Runs in Cypress' **Node** process (registered as a task in `cypress.config.ts`), because the
 * browser cannot read the committed baseline files.
 *
 * ── Why hand-rolled rather than a plugin ─────────────────────────────────────────────────────
 * Visual regression plugins wrap roughly this much code around `pixelmatch`, and the part that
 * decides whether the suite is useful or infuriating — the tolerance, and what happens when a
 * baseline is missing — is exactly the part a plugin hides behind options. For a boilerplate
 * every copy inherits that choice, so it is written out here where it can be read and changed.
 *
 * ── The two numbers, and why there are two ───────────────────────────────────────────────────
 * `PIXEL_THRESHOLD` is per-pixel colour tolerance: how different two pixels must be before
 * `pixelmatch` counts them as different at all. It absorbs antialiasing and sub-pixel font
 * rendering, which differ between machines without anything having changed.
 *
 * `MAX_DIFFERING_RATIO` is how much of the image may differ before the test fails. A single
 * changed glyph is a handful of pixels; a shifted layout is thousands. The ratio is what
 * separates "a font rendered a hair differently" from "the page moved".
 *
 * Both are deliberately loose. A visual test that fails on noise gets its baselines re-approved
 * without being looked at, and at that point it is worse than not existing — it produces the
 * paperwork of review without the review.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/** Per-pixel colour tolerance, 0–1. Higher tolerates more antialiasing difference. */
const PIXEL_THRESHOLD = 0.15;

/** Fraction of the image allowed to differ before this counts as a regression. */
const MAX_DIFFERING_RATIO = 0.002;

export interface CompareOptions {
    /** Snapshot name, used for the baseline and diff filenames. */
    name: string;
    /** Absolute path of the screenshot Cypress just wrote. */
    actualPath: string;
    /**
     * Repo-relative path of the spec that took the screenshot.
     *
     * The baselines live in a `__snapshots__` folder beside it, so they belong to whatever owns
     * the spec — a module, or the shell — and are deleted by deleting it.
     */
    specRelative: string;
    /** Directory for diff images produced on failure. */
    diffDirectory: string;
    /** When true, overwrite the baseline instead of comparing against it. */
    update: boolean;
}

export interface CompareResult {
    /** `true` when the snapshot matches, or when a baseline was just created. */
    passed: boolean;
    /** Human-readable outcome for the test's failure message. */
    message: string;
}

/**
 * Compare one screenshot against its baseline.
 *
 * Three outcomes, and the first is the one worth understanding:
 *
 *   1. **No baseline yet** → write it and PASS. A first run cannot fail, because there is nothing
 *      to compare against; failing would only mean "this is new". The baseline is committed, so
 *      the diff that matters is the one a reviewer sees in the pull request when the image
 *      changes — that is where a human actually looks at the picture.
 *   2. **Different dimensions** → fail immediately. Comparing images of different sizes pixel by
 *      pixel is meaningless, and a size change is itself a layout regression.
 *   3. **Same size** → compare, and fail when more than `MAX_DIFFERING_RATIO` differs.
 */
export const compareSnapshot = (options: CompareOptions): CompareResult => {
    const { name, actualPath, specRelative, diffDirectory, update } = options;

    /*
     * `__snapshots__` beside the spec. Resolved here rather than in the browser because only Node
     * can touch the filesystem, and `process.cwd()` is the repo root for anything `npm run` starts
     * — the same assumption `scripts/testReport.ts` makes.
     */
    const baselineDirectory = path.join(process.cwd(), path.dirname(specRelative), '__snapshots__');
    const baselinePath = path.join(baselineDirectory, `${name}.png`);

    mkdirSync(baselineDirectory, { recursive: true });

    const actual = PNG.sync.read(readFileSync(actualPath));

    if (update || !existsSync(baselinePath)) {
        writeFileSync(baselinePath, PNG.sync.write(actual));
        return {
            passed: true,
            message: update
                ? `baseline updated: ${name}`
                : `baseline created: ${name} — commit it, and review the image in the diff`
        };
    }

    const baseline = PNG.sync.read(readFileSync(baselinePath));

    if (baseline.width !== actual.width || baseline.height !== actual.height)
        return {
            passed: false,
            message:
                `${name}: size changed — baseline ${baseline.width}x${baseline.height}, ` +
                `now ${actual.width}x${actual.height}. A size change IS a layout change; there is ` +
                `nothing meaningful to diff pixel by pixel.`
        };

    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const differingPixels = pixelmatch(
        baseline.data,
        actual.data,
        diff.data,
        baseline.width,
        baseline.height,
        { threshold: PIXEL_THRESHOLD }
    );

    const total = baseline.width * baseline.height;
    const ratio = differingPixels / total;

    if (ratio <= MAX_DIFFERING_RATIO)
        return {
            passed: true,
            message: `${name}: ${differingPixels} pixel(s) differ, within budget`
        };

    mkdirSync(diffDirectory, { recursive: true });
    const diffPath = path.join(diffDirectory, `${name}.diff.png`);
    writeFileSync(diffPath, PNG.sync.write(diff));

    return {
        passed: false,
        message:
            `${name}: ${differingPixels} of ${total} pixels differ ` +
            `(${(ratio * 100).toFixed(3)}%, budget ${(MAX_DIFFERING_RATIO * 100).toFixed(3)}%).\n` +
            `  Diff image: ${diffPath}\n` +
            `  If the change is intended, re-record with:\n` +
            `    npm run test:e2e:visual:update`
    };
};
