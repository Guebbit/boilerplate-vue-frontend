/**
 * @module
 * Every cookie and storage key this app leaves in a visitor's browser: one row each, written once,
 * read by the code that sets it (the names) and by the privacy page (`#cookies`, as a table).
 * The purpose and lifetime cells are not text here but translation keys under
 * `browser-storage.rows.<id>`, so a shop edits the wording at runtime like any other text.
 * Cookies the backend sets are listed too: the visitor's browser holds them all the same.
 * See `docs/theory/data-protection.md` for the legal reading of the two `necessity` values.
 */
import { BROWSER_STORAGE_DATA, BROWSER_STORAGE_NAMES } from './browser-storage.generated';

/**
 * Where an item is kept.
 */
export type BrowserStorageKind = 'cookie' | 'localStorage' | 'sessionStorage';

/**
 * Who writes the item.
 */
export type BrowserStorageSetter = 'backend' | 'frontend' | 'library';

/**
 * Whether the item needs the visitor's agreement. `necessary` items are exempt (ePrivacy Art.
 * 5(3)): they keep a session, a security check or a choice the visitor made. `consent` items
 * exist only after the visitor agreed.
 */
export type BrowserStorageNecessity = 'necessary' | 'consent';

/**
 * A condition under which the item exists at all. Absent: always.
 *
 * - `analytics`: Umami or Faro is configured, so the consent banner exists.
 * - `faro`: a Faro receiver is configured.
 */
export type BrowserStorageCondition = 'analytics' | 'faro';

/**
 * One cookie or storage key the app leaves behind.
 */
export interface BrowserStorageItem {
    /**
     * Stable id: the key into {@link BROWSER_STORAGE_NAME} and the translation key
     * `browser-storage.rows.<id>.purpose` / `.lifetime`.
     */
    id: keyof typeof BROWSER_STORAGE_NAME;
    /**
     * Where it is kept.
     */
    kind: BrowserStorageKind;
    /**
     * Who writes it.
     */
    setter: BrowserStorageSetter;
    /**
     * Whose domain holds it. Everything here is the shop's own; a vendor widget that sets its own
     * cookies is named on the page instead (see the antibot note).
     */
    party: 'first';
    /**
     * Whether it needs the visitor's agreement.
     */
    necessity: BrowserStorageNecessity;
    /**
     * When it exists at all; absent for an item every visitor can have.
     */
    when?: BrowserStorageCondition;
}

/**
 * The name each item is stored under. The code that sets or reads an item imports its name from
 * here, so this list cannot drift from what the browser actually holds. Two entries are prefixes:
 * `checkoutDraft` is followed by the signed-in user's id.
 */
export const BROWSER_STORAGE_NAME = BROWSER_STORAGE_NAMES;

/**
 * Six months in days: the lifetime of a remembered answer (CNIL and Garante advise asking again
 * after about six months) and of the guided-tour record.
 */
export const SIX_MONTHS_DAYS = 183;

/**
 * The full inventory, in the order the privacy page shows it: what keeps a visitor signed in,
 * then their choices, then the cart and checkout, then what exists only after consent. Built from
 * the backend's synced cookie list and `shared/rules/browser-storage.yaml`.
 */
export const BROWSER_STORAGE_ITEMS: readonly BrowserStorageItem[] = BROWSER_STORAGE_DATA.map(
    (row) => ({ ...row, party: 'first' })
);

/**
 * The inventory a visitor of this deployment can actually hold: items whose condition does not
 * hold here are left out, so the page never lists a cookie the shop cannot set.
 *
 * @param conditions - Which optional conditions hold in this deployment.
 * @param conditions.analytics - A consent banner exists (Umami or Faro is configured).
 * @param conditions.faro - A Faro receiver is configured.
 * @returns The items to show, in display order.
 */
export const browserStorageFor = (conditions: {
    analytics: boolean;
    faro: boolean;
}): BrowserStorageItem[] =>
    BROWSER_STORAGE_ITEMS.filter((item) => !item.when || conditions[item.when]);
