/**
 * The arbitrary-value gate rots when a one-off disable is copied until it is a habit. Lint cannot
 * see that, because each use looks fine one file at a time.
 *
 * No arbitrary class (`w-[420px]`) appears in more than `arbitraryRepeatLimit` places, disabled
 * or not: a second use is a token in `main.css`.
 */
import { describe, expect, it } from 'vitest';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DESIGN_POLICY } from '../../scripts/design-policy';

/** The repo root (tests run from it). */
const ROOT = process.cwd();

/** Source that styles the app: SFCs and scripts under `src/`, test folders excluded. */
const styledFiles = (): string[] =>
    globSync('src/**/*.{vue,ts}', { cwd: ROOT }).filter(
        (file) => !/(?:^|\/)tests\//.test(file) && !file.endsWith('.spec.ts')
    );

/** Strips template and script comments, so a class named in prose is not counted as a use. */
const withoutComments = (source: string): string =>
    source
        .replaceAll(/<!--[\S\s]*?-->/g, '')
        .replaceAll(/\/\*[\S\s]*?\*\//g, '')
        .replaceAll(/^\s*\/\/.*$/gm, '');

/** An arbitrary class: optional variants, a utility name, then a `[value]` and optional opacity. */
const ARBITRARY_CLASS = /(?<![\w[-])(?:[\w-]+:)*-?[a-z][\w-]*-\[[^\s\]]+](?:\/[\w.]+)?/g;

/** The count of places a class is used: occurrences, not files, so two in one file count twice. */
const placesOf = (token: RegExp): Map<string, number> => {
    const places = new Map<string, number>();
    for (const file of styledFiles()) {
        for (const [match] of withoutComments(readFileSync(path.join(ROOT, file), 'utf8')).matchAll(
            token
        )) {
            places.set(match, (places.get(match) ?? 0) + 1);
        }
    }
    return places;
};

describe('arbitrary Tailwind values', () => {
    it('finds some arbitrary values, so a scan that sees nothing cannot pass', () => {
        expect(placesOf(ARBITRARY_CLASS).size).toBeGreaterThan(0);
    });

    it('has none repeated beyond the limit: a repeated value is a token', () => {
        const repeated = [...placesOf(ARBITRARY_CLASS)]
            .filter(([, count]) => count > DESIGN_POLICY.arbitraryRepeatLimit)
            .map(([name, count]) => `${name} ×${count}`);

        expect(
            repeated,
            'Add the value to @theme in src/styles/main.css and run `npm run lint:fix`'
        ).toEqual([]);
    });
});
