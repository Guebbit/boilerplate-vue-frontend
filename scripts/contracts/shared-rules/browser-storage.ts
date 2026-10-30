/**
 * @module
 * Builds the browser-storage inventory from its two sources: the backend's cookies (synced in as
 * `contracts/cookies.yaml`) and this repo's own rows. `order` is the single place the display
 * order lives, so a cookie the backend adds fails the build here until it is given a place.
 * Pure: no filesystem, so a test can walk every refusal.
 *
 * See: docs/tools/shared-rules.md
 */
import type { BrowserStorageRules, SyncedCookies } from './rules';

/** One row of the merged inventory, as the generated file carries it. */
interface InventoryRow {
    /** The row's id. */
    id: string;
    /** The name the browser stores it under. */
    name: string;
    /** Who writes it. */
    setter: 'backend' | 'frontend' | 'library';
    /** Where it lives. */
    kind: 'cookie' | 'localStorage' | 'sessionStorage';
    /** Whether it needs the visitor's agreement. */
    necessity: 'necessary' | 'consent';
    /** The feature that has to be configured for the row to exist. */
    when?: 'analytics' | 'faro';
}

/** What the generated file is written from. */
export interface BrowserStorageDocument {
    /** The rows in display order. */
    items: InventoryRow[];
    /** Each row's stored name, by id. */
    names: Record<string, string>;
}

/**
 * The ids that appear more than once in a list.
 *
 * @param ids - the list to check
 * @returns each repeated id
 */
const repeated = (ids: readonly string[]): string[] =>
    ids.filter((id, index) => ids.indexOf(id) !== index);

/**
 * Merges the backend's cookies and the frontend's own rows into one ordered inventory.
 *
 * @param own - the parsed `shared/rules/browser-storage.yaml`
 * @param synced - the parsed `contracts/cookies.yaml`
 * @returns the rows in `order`, and their names by id
 * @throws {Error} when an id is in both sources, repeated in `order`, missing from it, or listed in it with no row
 */
export const buildBrowserStorage = (
    own: BrowserStorageRules,
    synced: SyncedCookies
): BrowserStorageDocument => {
    const backendRows: Record<string, InventoryRow> = Object.fromEntries(
        Object.entries(synced.cookies).map(([id, row]) => [
            id,
            { id, name: row.name, setter: row.setter, kind: row.kind, necessity: row.necessity }
        ])
    );
    const ownRows: Record<string, InventoryRow> = Object.fromEntries(
        Object.entries(own.items).map(([id, row]) => [id, { id, ...row }])
    );

    const clash = Object.keys(ownRows).filter((id) => id in backendRows);
    if (clash.length > 0)
        throw new Error(`browser-storage: ${clash.join(', ')} is also a backend cookie`);

    const rows = { ...backendRows, ...ownRows };
    const twice = repeated(own.order);
    if (twice.length > 0) throw new Error(`browser-storage: order lists ${twice.join(', ')} twice`);
    const missing = Object.keys(rows).filter((id) => !own.order.includes(id));
    if (missing.length > 0)
        throw new Error(`browser-storage: order has no place for ${missing.join(', ')}`);
    const unknown = own.order.filter((id) => !(id in rows));
    if (unknown.length > 0)
        throw new Error(`browser-storage: order lists ${unknown.join(', ')}, which has no row`);

    const names = Object.values(rows).map((row) => row.name);
    if (new Set(names).size !== names.length)
        throw new Error('browser-storage: two rows share a stored name');

    const items = own.order.map((id) => rows[id]);
    return {
        items,
        names: Object.fromEntries(items.map((row) => [row.id, row.name]))
    };
};
