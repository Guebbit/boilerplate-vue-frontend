/**
 * @module
 * Report-only audit: locale keys nothing in the app reads. `report.ts` prints it.
 *
 * A key nobody reads is a dead leftover from a refactor, or a misplaced one that was never wired
 * to a component. A locale file has no compiler, so only a read of the source finds it.
 *
 * A key is "used" when its dot-path appears literally in the app's `.vue`/`.ts` source, or inside
 * ANOTHER dictionary entry's string (a linked message, `@:a.b.c`). A key built dynamically
 * (`` t(`generic.${code}`) ``) never appears as a literal, so any key under a template-literal
 * prefix is exempt — permissive on purpose, since this audit never blocks anything.
 *
 */
import { globSync, readFileSync } from 'node:fs';

/** A parsed dictionary: nested objects whose leaves are strings or arrays. */
export interface Dictionary {
    [key: string]: string | readonly unknown[] | Dictionary;
}

/**
 * Every leaf path a dictionary declares. An array (a static page's paragraph list) is one leaf:
 * `tm()`/`rt()` read it whole, never by element path.
 *
 * @param dictionary - The parsed dictionary.
 * @param prefix - The path walked so far.
 * @returns Dot-joined leaf paths.
 */
export const leafPathsOf = (dictionary: Dictionary, prefix = ''): string[] =>
    Object.entries(dictionary).flatMap(([key, value]) => {
        const leaf = prefix ? `${prefix}.${key}` : key;
        return typeof value === 'string' || Array.isArray(value)
            ? [leaf]
            : leafPathsOf(value as Dictionary, leaf);
    });

/**
 * The key prefixes the source builds dynamically: a template literal up to its `${`, or a quoted
 * string ending in `.` or `-` that a helper appends a code to.
 *
 * @param sourceText - All source text, joined.
 * @returns The prefixes.
 */
export const dynamicPrefixesOf = (sourceText: string): string[] =>
    [
        ...sourceText.matchAll(/`([\w.-]+)\${/g),
        ...sourceText.matchAll(/["']([a-z][\w.-]*[.-])["']/g)
    ].map(([, prefix]) => prefix);

/**
 * The leaf paths no source or linked message reads.
 *
 * @param dictionary - One dictionary.
 * @param haystack - Source text plus every dictionary stringified.
 * @param prefixes - From {@link dynamicPrefixesOf}.
 * @returns The unused leaf paths.
 */
export const unusedPaths = (
    dictionary: Dictionary,
    haystack: string,
    prefixes: readonly string[]
): string[] =>
    leafPathsOf(dictionary).filter(
        (leaf) => !haystack.includes(leaf) && !prefixes.some((prefix) => leaf.startsWith(prefix))
    );

/**
 * Parses one locale JSON file.
 *
 * @param file - Repo-relative path.
 * @returns The dictionary.
 */
const readDictionary = (file: string): Dictionary =>
    JSON.parse(readFileSync(file, 'utf8')) as Dictionary;

/**
 * Scans the repo in the working directory.
 *
 * @returns One `file: dot.path` line per unused key, and the number of files read.
 */
export const scanLocaleKeys = (): { unused: string[]; files: number } => {
    const sourceText = globSync(['src/**/*.vue', 'src/**/*.ts'])
        .map((file) => readFileSync(file, 'utf8'))
        .join('\n');
    const prefixes = dynamicPrefixesOf(sourceText);
    const files = globSync(['src/locales/*.json', 'src/modules/*/locales/*.json']);
    const dictionaries = files.map((file) => ({ file, dictionary: readDictionary(file) }));
    const haystack = [sourceText, ...dictionaries.map((d) => JSON.stringify(d.dictionary))].join(
        '\n'
    );
    return {
        unused: dictionaries.flatMap(({ file, dictionary }) =>
            unusedPaths(dictionary, haystack, prefixes).map((leaf) => `${file}: ${leaf}`)
        ),
        files: files.length
    };
};
