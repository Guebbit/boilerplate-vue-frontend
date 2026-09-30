/**
 * @module
 * The server's `sort` grammar (JSON:API: `-price,title`) and its two client-side shapes: the CSV a
 * URL and a filter box hold, and Vuetify's `{ key, order }[]` a table header edits. Pure
 * conversions, so every list page shares one reading of the grammar.
 */

/**
 * Vuetify's sort state — what `v-data-table`'s `sort-by` model holds.
 */
export type SortByModel = { key: string; order?: boolean | 'asc' | 'desc' }[];

/**
 * The one sort a table or a select can express: a field and a direction. The server accepts up to
 * three; the UI drives one, so a header click replaces the sort instead of stacking on it.
 */
export interface SingleSort {
    /** The wire field name, without the `-`. */
    key: string;
    /** `true` for descending. */
    descending: boolean;
}

/**
 * Reads the first token of a sort CSV.
 *
 * @param csv - `-price,title`, or `undefined` for none.
 * @returns The first field and its direction, or `undefined` when there is none.
 */
export const firstSortOf = (csv: string | undefined): SingleSort | undefined => {
    const token = csv?.split(',').at(0)?.trim();
    if (token === undefined || token === '' || token === '-') return undefined;
    return token.startsWith('-')
        ? { key: token.slice(1), descending: true }
        : { key: token, descending: false };
};

/**
 * Spells a sort as its wire token.
 *
 * @param sort - The field and direction.
 * @returns `price` or `-price`.
 */
export const sortToken = ({ key, descending }: SingleSort): string =>
    descending ? `-${key}` : key;

/**
 * Turns a sort CSV into what a table header shows.
 *
 * @param csv - The stored sort.
 * @returns A one-entry Vuetify sort, or `[]` for none.
 */
export const sortByFromCsv = (csv: string | undefined): SortByModel => {
    const sort = firstSortOf(csv);
    return sort ? [{ key: sort.key, order: sort.descending ? 'desc' : 'asc' }] : [];
};

/**
 * Turns a header click into the stored sort.
 *
 * Vuetify's `order` is `'asc'`, `'desc'`, or absent/`true`/`false` for an unsorted column; only the
 * two words are a direction. Only the first entry counts, matching {@link SingleSort}.
 *
 * @param sortBy - The table's new sort state.
 * @returns The wire token, or `undefined` when the sort was cleared.
 */
export const csvFromSortBy = (sortBy: SortByModel): string | undefined => {
    const first = sortBy.at(0);
    if (!first || (first.order !== 'asc' && first.order !== 'desc')) return undefined;
    return sortToken({ key: first.key, descending: first.order === 'desc' });
};

/**
 * Keeps a sort CSV only if every token is one the contract allows — a hand-edited URL must not
 * reach the API just to be refused with a 422.
 *
 * @param csv - The sort as read from the URL.
 * @param allowed - The contract's own enum object (`ProductSortItem`), whose values are the tokens.
 * @returns The tokens as the typed list the request wants, or `undefined` when none/any is invalid.
 */
export const sortTokensOf = <TToken extends string>(
    csv: string | undefined,
    allowed: Readonly<Record<string, TToken>>
): TToken[] | undefined => {
    const values: readonly string[] = Object.values(allowed);
    const tokens = (csv ?? '')
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token !== '');
    const valid = tokens.filter((token): token is TToken => values.includes(token));
    return valid.length > 0 && valid.length === tokens.length ? valid : undefined;
};

/**
 * The fields a list can be sorted by, from the contract's own enum.
 *
 * @param allowed - The generated enum object (`ProductSortItem`): each field and its `-` twin.
 * @returns The bare field names, once each.
 */
export const sortFieldsOf = (allowed: Readonly<Record<string, string>>): string[] => [
    ...new Set(Object.values(allowed).map((token) => token.replace(/^-/, '')))
];
