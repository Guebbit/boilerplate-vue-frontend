/**
 * @module
 * Makes a list row say what it omits. The staff lists are stored with the toolkit's `partial`
 * merge, which lays a row over the full record already cached. A key the row leaves out is
 * absent-means-unset (the API never sends `null`), but a merge keeps the cached value, so a field
 * someone else cleared would stay on screen. {@link unsetOmitted} turns each omitted key of the
 * row's own schema into an explicit `undefined`, which the merge then writes over the stale value.
 * Keys outside the list schema (detail-only fields) are never named, so the merge leaves them.
 */

import { isEqual } from 'lodash-es';

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

/**
 * Remembers which cached records a list row has just disagreed with, so the next detail read
 * fetches them again. A `partial` merge keeps a record's freshness, so a fresh full record whose
 * list fields moved under it would otherwise be served as it was.
 *
 * @param listKeys - Every key the list item declares; only these are compared, since a row never
 *   carries the detail-only fields.
 * @returns `note` (record the rows that differ from the cache) and `take` (whether an id was
 *   noted, forgetting it).
 */
export const createListStaleTracker = <TRow extends { id: string }>(
    listKeys: Record<keyof TRow, true>
) => {
    const staleIds = new Set<string>();
    return {
        /**
         * Notes each row that differs from the cached record on any list key. A row with nothing
         * cached has nothing to be stale against.
         *
         * @param rows - The rows a list answered.
         * @param cachedOf - The cached record of an id, if any.
         */
        note: (rows: TRow[], cachedOf: (id: string) => object | undefined): void => {
            for (const row of rows) {
                const cached = cachedOf(row.id) as Partial<TRow> | undefined;
                if (!cached) continue;
                // A key the row omits reads `undefined`, so a cleared field counts as a change.
                const changed = (Object.keys(listKeys) as (keyof TRow)[]).some(
                    (key) => !isEqual(cached[key], row[key])
                );
                if (changed) staleIds.add(row.id);
            }
        },
        /**
         * @param id - The record about to be read.
         * @returns Whether a list row had disagreed with it since its last detail read.
         */
        take: (id: string): boolean => staleIds.delete(id)
    };
};
