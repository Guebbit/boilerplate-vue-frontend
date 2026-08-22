/**
 * Every count this app renders is announced as a count.
 *
 * Vuetify's `v-badge` wraps its child in a decorative element that carries no accessible name of
 * its own: with no `label`, a screen reader announces the badge as "Badge" and the number never
 * reaches the user. The visual result is identical either way, which is the whole problem — the
 * attribute is invisible when it is missing, and no lint rule knows what a `v-badge` is.
 *
 * The nav renders badges in three places today, under two different mechanisms: `AppNavMenu` and
 * `AppNavigation` each write a `<v-badge>` inline for a list entry, while `AppNavIconButton` takes
 * the name as a `badgeLabel` prop and passes it down. That prop is optional, so the icon button is
 * one forgetful caller away from the same silence its own docblock warns about.
 *
 * ── Why a test rather than a shared component ────────────────────────────────────────────────
 * The two list-entry copies could be folded into one `AppNavEntry`, and that would hold the rule
 * for those two. It would do nothing for `AppNavIconButton`, which renders its badge around a
 * button rather than inside a list item and could never share that component — nor for the fourth
 * surface, wherever it turns up. What matters here is the invariant, not the duplication, so the
 * invariant is what is pinned. The duplication is small and deliberate; see either component.
 *
 * ── What counts as a name ────────────────────────────────────────────────────────────────────
 * `label` (Vuetify's own, static or bound) or an explicit `aria-label`. A badge that is genuinely
 * decorative — a status dot carrying no information — satisfies the rule with `aria-hidden`,
 * which is a claim someone has to make on purpose rather than one they can drift into.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_ROOT = path.resolve(ROOT, 'src');

/** Every `.vue` file the app ships, excluding anything under a `tests` folder. */
const componentFiles = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === 'tests' ? [] : componentFiles(entryPath);
        return entry.name.endsWith('.vue') ? [entryPath] : [];
    });

/**
 * The opening tag of every `<v-badge>` in a source file.
 *
 * Scanned quote-aware rather than matched with `/<v-badge[^>]*>/`: an attribute value may itself
 * contain a `>` — `:content="count > 99 ? '99+' : count"` is ordinary Vue — and a naive character
 * class ends the tag at that `>`. Any attribute written after it is cut off the string this
 * returns, so a badge whose `label` sits further down the tag is reported as missing one. That is
 * the one failure mode a guard like this must not have: it fails a correct page, and the fix a
 * reader reaches for is to reorder attributes until the guard stops complaining.
 */
const badgeTagsOf = (source: string): string[] => {
    const tags: string[] = [];
    for (const { index: start } of source.matchAll(/<v-badge\b/g)) {
        let quote: string | undefined;
        for (let index = start; index < source.length; index++) {
            const character = source[index];
            if (quote) {
                if (character === quote) quote = undefined;
            } else if (character === '"' || character === "'") quote = character;
            else if (character === '>') {
                tags.push(source.slice(start, index + 1));
                break;
            }
        }
    }
    return tags;
};

/** Whether one badge tag carries something a screen reader can announce. */
const isNamed = (tag: string): boolean => /(^|\s)(:?label|:?aria-label|aria-hidden)[\s=]/.test(tag);

const badgesInSource = (): { file: string; tag: string }[] =>
    componentFiles(SOURCE_ROOT).flatMap((file) =>
        badgeTagsOf(readFileSync(file, 'utf8')).map((tag) => ({
            file: path.relative(ROOT, file),
            tag
        }))
    );

describe('a badge says what it counts', () => {
    it('names every v-badge the app renders', () => {
        const unnamed = badgesInSource()
            .filter(({ tag }) => !isNamed(tag))
            .map(
                ({ file }) => `${file} renders a v-badge with no label, aria-label or aria-hidden`
            );

        expect(unnamed).toEqual([]);
    });

    /**
     * The guard on the guard. A scanner that silently stopped matching — a Vuetify rename, a
     * refactor moving badges behind a wrapper — would satisfy the assertion above by finding
     * nothing at all, and report a rule it had stopped enforcing as kept.
     */
    it('is checking the badges it is meant to be checking', () => {
        expect(badgesInSource().length).toBeGreaterThanOrEqual(3);
    });
});
