/**
 * @module
 * Makes a list row say what it omits. The staff lists are stored with the toolkit's `partial`
 * merge, which lays a row over the full record already cached. A key the row leaves out is
 * absent-means-unset (the API never sends `null`), but a merge keeps the cached value, so a field
 * someone else cleared would stay on screen. {@link unsetOmitted} turns each omitted key of the
 * row's own schema into an explicit `undefined`, which the merge then writes over the stale value.
 * Keys outside the list schema (detail-only fields) are never named, so the merge leaves them.
 */

/**
 * Fills in `undefined` for every key of the list schema that `row` omits.
 *
 * @param listKeys - Every key the list item declares. A `Record<keyof TRow, true>` so the compiler
 *   refuses a list that misses a key the contract gained.
 * @param row - One list row as the API answered it.
 * @returns The row, plus an `undefined` for each declared key it left out.
 */
export const unsetOmitted = <TRow extends object>(
    listKeys: Record<keyof TRow, true>,
    row: TRow
): TRow => {
    const unset = Object.fromEntries(Object.keys(listKeys).map((key) => [key, undefined]));
    // Object.fromEntries cannot name the keys; they are exactly `keyof TRow` by construction.
    return { ...(unset as Partial<TRow>), ...row };
};
