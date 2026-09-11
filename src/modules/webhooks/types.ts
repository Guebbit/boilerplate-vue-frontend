/**
 * @module
 * View-only types for the webhooks module — shapes used to wire a view to a presentational
 * component, not part of the API contract (`@types`) or the store's own state.
 */
import type { WebhookDeliveryStatus } from '@types';

/**
 * The delivery log's filter bar state, as emitted by `WebhookDeliveriesFilters` and mirrored into
 * the route's query string by `WebhookDeliveries.vue`.
 */
export interface WebhookDeliveryFilters {
    /** Restrict to one subscription's deliveries, or every subscription when unset. */
    subscriptionId?: string;
    /** Restrict to one delivery status, or every status when unset. */
    status?: WebhookDeliveryStatus;
    /** 1-based page — kept with the filters, since a stale page belongs to a stale filter set. */
    page: number;
}
