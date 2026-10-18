/**
 * @module
 * The app's own CSS classes, read from the stylesheets so `no-unknown-classes` never needs a list.
 *
 * Two kinds, because a class is only real where its CSS reaches:
 * - global: a class in `src/styles/*.css` or in an unscoped SFC `<style>` block, valid in any file;
 * - scoped: a class in a `<style scoped>` block, valid in that one SFC. A scoped class used in
 *   another file styles nothing, so it is reported there.
 */
import { globSync, readFileSync } from 'node:fs';
import postcss from 'postcss';
import { parse } from 'vue/compiler-sfc';

/** The classes the stylesheets define. */
export interface StylesheetClasses {
    /** Valid in every file. */
    global: ReadonlySet<string>;
    /** Valid in one SFC only, keyed by its path relative to the repo root (forward slashes). */
    scopedByFile: ReadonlyMap<string, ReadonlySet<string>>;
}

/** A class selector inside a selector list: `.name`, `:deep(.name)` included. */
const CLASS_SELECTOR = /\.(-?[A-Z_a-z][\w-]*)/g;

/**
 * Collects the class names a stylesheet's selectors define.
 *
 * @param css - The stylesheet text.
 * @returns Each class name once.
 */
export const classesOfCss = (css: string): Set<string> => {
    const found = new Set<string>();
    // postcss: https://postcss.org/api/ — `walkRules` visits every style rule, nested ones included.
    postcss.parse(css).walkRules((rule) => {
        for (const match of rule.selector.matchAll(CLASS_SELECTOR)) {
            found.add(match[1]);
        }
    });
    return found;
};

/**
 * Reads every stylesheet under `src/`: the plain CSS files and the `<style>` blocks of the SFCs.
 *
 * @param root - The repo root.
 */
export const readStylesheetClasses = (root: string): StylesheetClasses => {
    const global = new Set<string>();
    const scopedByFile = new Map<string, Set<string>>();

    for (const file of globSync('src/**/*.css', { cwd: root })) {
        for (const name of classesOfCss(readFileSync(`${root}/${file}`, 'utf8'))) global.add(name);
    }

    for (const file of globSync('src/**/*.vue', { cwd: root })) {
        const relativePath = file.replaceAll('\\', '/');
        // vue/compiler-sfc `parse` splits an SFC into its blocks without compiling anything.
        const { descriptor } = parse(readFileSync(`${root}/${file}`, 'utf8'), {
            filename: relativePath
        });
        for (const block of descriptor.styles) {
            const names = classesOfCss(block.content);
            if (!block.scoped) for (const name of names) global.add(name);
            else if (names.size > 0)
                scopedByFile.set(
                    relativePath,
                    new Set([...(scopedByFile.get(relativePath) ?? []), ...names])
                );
        }
    }

    return { global, scopedByFile };
};

/** Escapes a class name for use inside a regular expression. */
const escapeRegex = (name: string): string =>
    name.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);

/**
 * Turns class names into the anchored regex patterns `no-unknown-classes` takes as `ignore`.
 *
 * @param names - Exact class names.
 */
export const ignorePatterns = (names: Iterable<string>): string[] =>
    [...names].toSorted().map((name) => `^${escapeRegex(name)}$`);
