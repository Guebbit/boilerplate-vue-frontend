/**
 * @module
 * Zod validation schemas for the webhook subscription form, with i18n-thunked error messages
 * resolved at parse time rather than at schema-definition time.
 *
 * `url`'s `https://` requirement is imported from `@api/schemas`, like `users`' contract-declared
 * minimums are — the contract itself carries the scheme restriction as a `pattern` now, so there
 * is a bound regex to reuse instead of a hand-rolled `.refine()`. `eventTypes`' minimum stays a
 * plain rule: the generated bodies have no bound constant for it (`.min(1)` inline).
 */
import { z } from 'zod';
import { translate } from '@/infrastructure/i18n';
import { createWebhookSubscriptionBodyUrlRegExp } from '@api/schemas';

/**
 * Validation schema for a subscription's target URL: syntactically valid, and `https://`
 * specifically — the backend re-validates this against the resolved IP on every delivery, but a
 * scheme typo is worth catching before the round trip. `create` and `update` share one regex on
 * the contract, so reusing the create-named export for both draws no distinction that isn't there.
 */
const webhookUrlSchema = z
    .url({ error: () => translate('webhooks-form.url-invalid') })
    .regex(createWebhookSubscriptionBodyUrlRegExp, {
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
