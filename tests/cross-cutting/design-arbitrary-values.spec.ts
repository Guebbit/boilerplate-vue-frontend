/**
 * The arbitrary-value gate has two ways to rot: a one-off disable copied until it is a habit, and
 * an exemption that outlives the class it was written for. Lint cannot see either, because each
 * looks fine one file at a time.
 *
 * ── What each case guards ──────────────────────────────────────────────────────────────────
 * 1. No arbitrary class (`w-[420px]`) appears in more than `arbitraryRepeatLimit` places, disabled
 *    or not: a second use is a token in `main.css`.
 * 2. Every exemption in `scripts/design-policy.ts` (Vuetify-owned classes, allowed ambiguous
 *    names) still matches a class used in `src/`; a stale one fails.
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
    it('finds the reasoned one-offs, so a scan that sees nothing cannot pass', () => {
        expect([...placesOf(ARBITRARY_CLASS).keys()].toSorted()).toEqual([
            'grid-cols-[auto_1fr_auto]',
            'left-[-9999px]',
            'max-h-[60dvh]',
            'min-h-[60dvh]',
            'sm:grid-cols-[minmax(10rem,auto)_1fr]'
        ]);
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

describe('design policy exemptions', () => {
    /** Every word-ish token in `src/`, the superset a class pattern is matched against. */
    const tokens = [...placesOf(/[\w./:-]+/g).keys()];

    it('keeps a Vuetify-owned class pattern only while some template uses a class it matches', () => {
        const stale = DESIGN_POLICY.vuetifyOwnedClasses.filter(
            (pattern) => !tokens.some((token) => new RegExp(pattern).test(token))
        );

        expect(stale, 'delete the pattern from vuetifyOwnedClasses').toEqual([]);
    });

    it('keeps an allowed ambiguous name only while it is used', () => {
        const stale = DESIGN_POLICY.ambiguousUtilities
            .filter((entry) => !entry.restrict)
            .filter((entry) => !tokens.some((token) => new RegExp(entry.pattern).test(token)))
            .map((entry) => entry.pattern);

        expect(stale, 'delete the entry from ambiguousUtilities').toEqual([]);
    });
});
