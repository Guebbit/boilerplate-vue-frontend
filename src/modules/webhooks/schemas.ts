/**
 * @module
 * Zod validation schemas for the webhook subscription form, with i18n-thunked error messages
 * resolved at parse time rather than at schema-definition time.
 *
 * `url`'s `https://` requirement and `eventTypes`' minimum are enforced here as plain rules, not
 * imported from `@api/schemas` like `users`' contract-declared minimums are — the generated
 * `CreateWebhookSubscriptionBody`/`UpdateWebhookSubscriptionBody` schemas have no bound constants
 * for either (`zod.url()` alone, `.min(1)` inline), so there is nothing to import.
 */
import { z } from 'zod';
import { translate } from '@/infrastructure/i18n';

/**
 * Validation schema for a subscription's target URL: syntactically valid, and `https://`
 * specifically — the backend re-validates this against the resolved IP on every delivery, but a
 * scheme typo is worth catching before the round trip.
 */
const webhookUrlSchema = z
    .url({ error: () => translate('webhooks-form.url-invalid') })
    .refine((url) => url.startsWith('https://'), {
        error: () => translate('webhooks-form.url-must-be-https')
    });

/**
 * Validation schema for the event-type multiselect: at least one, matching the contract's own
 * `eventTypes` minimum on both the create and update bodies.
 */
const webhookEventTypesSchema = z
    .array(z.string())
    .min(1, { error: () => translate('webhooks-form.event-types-required') });

/**
 * Validation schema for creating a subscription: url and event types required, description
 * optional. No `enabled` field — a subscription is always created enabled.
 */
export const webhookCreateSchema = z.object({
    url: webhookUrlSchema,
    description: z.string().optional(),
    eventTypes: webhookEventTypesSchema
});

/**
 * Validation schema for editing a subscription: the same fields as create, plus `enabled`.
 */
export const webhookEditSchema = webhookCreateSchema.extend({
    enabled: z.boolean()
});
