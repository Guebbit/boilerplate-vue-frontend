/**
 * @module
 * Declares the response-envelope schema for every webhooks endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every webhooks endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const webhooksResponseSchemas: ResponseSchemaRoute[] = [
    {
        method: 'GET',
        pattern: /^\/webhooks\/subscriptions$/,
        schema: schemas.ListWebhookSubscriptionsResponse
    },
    {
        method: 'POST',
        pattern: /^\/webhooks\/subscriptions$/,
        schema: schemas.CreateWebhookSubscriptionResponse
    },
    {
        method: 'PATCH',
        pattern: /^\/webhooks\/subscriptions\/[^/]+$/,
        schema: schemas.UpdateWebhookSubscriptionResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/webhooks\/subscriptions\/[^/]+$/,
        schema: schemas.DeleteWebhookSubscriptionResponse
    },
    {
        method: 'GET',
        pattern: /^\/webhooks\/deliveries$/,
        schema: schemas.ListWebhookDeliveriesResponse
    },
    {
        method: 'POST',
        pattern: /^\/webhooks\/deliveries\/[^/]+\/replay$/,
        schema: schemas.ReplayWebhookDeliveryResponse
    },
    {
        method: 'GET',
        pattern: /^\/webhooks\/events$/,
        schema: schemas.ListWebhookEventsResponse
    }
];
