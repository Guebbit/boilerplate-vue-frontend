/**
 * The device sizes the browser suites lay the app out at come from ONE module,
 * `scripts/e2e/viewports.ts`, and every other file asks it by name.
 *
 * A size typed twice drifts: the matrix says 390 wide, a spec says 375, and a layout bug that
 * only exists at one of them is found by neither. This reads source and fails on the second
 * place a size is typed, the way `a11y-coverage.spec.ts` fails on a route nobody sweeps.
 *
 * Why those sizes, and what each band means: `docs/theory/design-system.md`.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { REPORT_VIEWPORTS, VIEWPORTS } from '../../scripts/e2e/viewports';
import { BREAKPOINTS } from '@/ui/vuetify/breakpoints';

/** The repo root (tests run from it). */
const ROOT = process.cwd();

/** The one module allowed to type a size. */
const MATRIX_FILE = 'scripts/e2e/viewports.ts';

/** The one file allowed to call `cy.viewport`. */
const SEAM_FILE = 'tests/support/e2e/apply-viewport.ts';

/** This spec names the patterns it forbids, so it cannot be scanned for them. */
const THIS_FILE = 'tests/cross-cutting/viewport-matrix.spec.ts';

/** A number typed as a size: `width: 390`, `viewportHeight: 800`. */
const SIZE_LITERAL = /\b(?:width|height|viewportWidth|viewportHeight):\s*\d{3,4}\b/;

/**
 * A size typed as a pair on a line that names a device: `const PHONE = [390, 844]`. A bare pair
 * is not enough, since `be.oneOf, [403, 404]` is a pair of status codes.
 */
const SIZE_PAIR =
    /(?:viewport|phone|tablet|desktop|screen|size)\w*\s*[(:=][^\n]*\[\s*\d{3,4}\s*,\s*\d{3,4}\s*]/i;

/** Every `.ts` file under `directory`, as repo-relative paths, skipping dependencies. */
const sources = (directory: string): string[] =>
    readdirSync(path.join(ROOT, directory), { withFileTypes: true }).flatMap((entry) => {
        const relative = path.posix.join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sources(relative);
        return entry.name.endsWith('.ts') ? [relative] : [];
    });

/**
 * Where a browser suite or a report tool could set a size. Unit specs are left out: a size there
 * is fixture data for a function under test, not a device the app is laid out at.
 */
const SCANNED = [
    ...sources('tests/e2e'),
    ...sources('tests/support/e2e'),
    ...sources('tests/support/lighthouse'),
    ...sources('scripts/e2e'),
    ...sources('scripts/lighthouse'),
    ...readdirSync(path.join(ROOT, 'src/modules')).flatMap((name) =>
        sources(`src/modules/${name}/tests`).filter((file) => file.includes('/e2e/'))
    ),
    'cypress.config.ts'
].filter((file) => ![MATRIX_FILE, THIS_FILE].includes(file));

/** The files in {@link SCANNED} whose text matches `pattern`. */
const filesMatching = (pattern: RegExp): string[] =>
    SCANNED.filter((file) => pattern.test(readFileSync(path.join(ROOT, file), 'utf8')));

describe('the viewport matrix', () => {
    it('scans enough files for the checks below not to be vacuous', () => {
        expect(SCANNED.length).toBeGreaterThan(100);
        expect(SCANNED).toContain('tests/support/e2e/a11y-sweep.ts');
    });

    it('is the only place a size is typed', () => {
        expect(filesMatching(SIZE_LITERAL)).toEqual([]);
        expect(filesMatching(SIZE_PAIR)).toEqual([]);
    });

    it('is applied through one seam: cy.viewport( is called nowhere else', () => {
        expect(filesMatching(/\bcy\.viewport\(/).filter((file) => file !== SEAM_FILE)).toEqual([]);
    });

    it('has a size in every band below xl, and one narrow enough for reflow (WCAG 1.4.10)', () => {
        const widths = Object.values(VIEWPORTS).map((viewport) => viewport.width);
        const bands = ['xs', 'sm', 'md', 'lg'] as const;

        for (const band of bands) {
            const lower = BREAKPOINTS[band];
            const upper = band === 'lg' ? BREAKPOINTS.xl : BREAKPOINTS[nextBand(band)];
            expect(
                widths.some((width) => width >= lower && width < upper),
                `a viewport in the ${band} band`
            ).toBe(true);
        }
        expect(Math.min(...widths)).toBeLessThanOrEqual(320);
    });

    it('keeps report-only sizes out of the swept matrix', () => {
        for (const name of Object.keys(REPORT_VIEWPORTS))
            expect(Object.keys(VIEWPORTS)).not.toContain(name);
    });
});

describe('the meta viewport (index.html)', () => {
    const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const content = /<meta\s+name="viewport"\s+content="([^"]*)"/.exec(html)?.[1] ?? '';

    it('lays out at the device width and starts at scale 1', () => {
        expect(content).toContain('width=device-width');
        expect(content).toContain('initial-scale=1');
    });

    it('never stops the visitor from zooming', () => {
        expect(content).not.toMatch(/user-scalable\s*=\s*(?:no|0)/);
        // axe's `meta-viewport-large` floor: a cap below 5 is a cap on 200 % text (WCAG 1.4.4).
        // No cap at all reads as Infinity.
        const maximum = Number(/maximum-scale\s*=\s*([\d.]+)/.exec(content)?.[1] ?? Infinity);
        expect(maximum).toBeGreaterThanOrEqual(5);
    });
});

/** The band after `band`, for the upper edge of its width range. */
function nextBand(band: 'xs' | 'sm' | 'md'): 'sm' | 'md' | 'lg' {
    return { xs: 'sm', sm: 'md', md: 'lg' }[band] as 'sm' | 'md' | 'lg';
}
