/**
 * @module
 * What the caller may subscribe to, read off the catalogue's `actions.subscribe` (the server
 * decides it: the caller holds the event's read rule). No client re-derives the rule.
 */

import type { WebhookEventCatalogEntry } from '@types';

/**
 * Vuetify `item-props` for the events multiselect: an event the caller may not read is shown but
 * cannot be picked, as GitHub does for a permission an App lacks.
 *
 * @param entry - one catalogue entry
 */
export const eventOptionProps = (entry: WebhookEventCatalogEntry): { disabled: boolean } => ({
    disabled: !entry.actions.subscribe
});

/**
 * Whether a stored filter names an event the caller may not read (`*` names them all). The server
 * refuses a change of url or events on such a subscription (403 `WEBHOOK_EVENT_READ_REQUIRED`), so
 * the form locks those two fields instead of offering a save that fails.
 *
 * @param stored - the subscription's stored `eventTypes`
 * @param catalogue - the catalogue as this caller sees it
 */
export const isStreamLocked = (
    stored: readonly string[],
    catalogue: readonly WebhookEventCatalogEntry[]
): boolean =>
    catalogue.some(
        (entry) => !entry.actions.subscribe && (stored.includes('*') || stored.includes(entry.name))
    );
