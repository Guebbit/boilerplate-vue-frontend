import type { TranslationDictionaries } from '@/infrastructure/i18n';

/**
 * The two shapes a dictionary travels in, and the conversions between them.
 *
 * The API stores FLAT rows — `products.list.title` as one string key, because a row is what gets
 * edited — while every dictionary this app renders is NESTED, because that is what vue-i18n eats.
 * The import dialog accepts the nested shape (it is what `src/locales/*.json` look like, so a
 * translator can round-trip a bundled file) and flattens it on the way in; the export builds the
 * nested shape back from the rows. Both live here, pure and side-effect free, because they are the
 * only real logic in this module and the part worth unit-testing without a browser.
 */

/**
 * Flattens a nested dictionary into the dotted rows the entries API stores.
 *
 * Arrays are legitimate vue-i18n messages — the static pages keep their paragraph lists in them —
 * and flatten to numeric segments: `{ list: ['a', 'b'] }` becomes `list.0` and `list.1`, which is
 * exactly what {@link expandEntries} folds back into an array.
 *
 * @param dictionary - The nested dictionary, e.g. a parsed `src/locales/en.json`.
 * @param prefix - Internal recursion state; leave empty.
 * @returns One `{ key, value }` pair per leaf string, dotted.
 */
export const flattenDictionary = (
    dictionary: TranslationDictionaries | TranslationDictionaries[] | string[],
    prefix = ''
): { key: string; value: string }[] =>
    Object.entries(dictionary).flatMap(([segment, value]) => {
        const key = prefix === '' ? segment : `${prefix}.${segment}`;
        if (typeof value === 'string') return [{ key, value }];
        return flattenDictionary(value, key);
    });

/**
 * Expands dotted rows back into the nested dictionary shape a client bundles.
 *
 * The inverse of {@link flattenDictionary}: a node whose keys are all numeric folds back into an
 * array, so `list.0` / `list.1` round-trips to `{ list: ['a', 'b'] }` rather than to an object
 * with the strings "0" and "1" as keys.
 *
 * Key collisions — `products.list` alongside `products.list.title` — cannot come out of the API,
 * which refuses them at write time precisely because no tree can hold both. If one arrives anyway,
 * the deeper key wins and the shallower string is dropped: silently losing the ambiguous row is
 * this function's job, refusing it is the server's.
 *
 * @param entries - Flat `{ key, value }` rows, e.g. one language's entries paged to completion.
 * @returns The nested dictionary.
 */
export const expandEntries = (
    entries: { key: string; value: string }[]
): TranslationDictionaries => {
    const root: TranslationDictionaries = {};
    for (const { key, value } of entries) {
        const segments = key.split('.');
        let node = root;
        for (const [index, segment] of segments.entries()) {
            if (index === segments.length - 1) {
                // Deeper keys win: never let a leaf overwrite a subtree another row already built.
                if (typeof node[segment] !== 'object') node[segment] = value;
                continue;
            }
            const child: unknown = node[segment];
            if (typeof child !== 'object' || child === null) node[segment] = {};
            node = node[segment] as TranslationDictionaries;
        }
    }
    return foldNumericNodes(root) as TranslationDictionaries;
};

/**
 * Recursively converts every node whose keys are all numeric into an array.
 *
 * @param node - A subtree of the expanded dictionary.
 * @returns The subtree, with numeric-keyed objects folded into arrays.
 */
const foldNumericNodes = (
    node: TranslationDictionaries | string
): TranslationDictionaries | TranslationDictionaries[] | string => {
    if (typeof node === 'string') return node;
    const folded = Object.fromEntries(
        Object.entries(node).map(([key, value]) => [
            key,
            foldNumericNodes(value as TranslationDictionaries | string)
        ])
    );
    const keys = Object.keys(folded);
    if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key)))
        return keys
            .toSorted((a, b) => Number(a) - Number(b))
            .map((key) => folded[key]) as TranslationDictionaries[];
    return folded;
};
