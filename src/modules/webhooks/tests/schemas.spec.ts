/**
 * @module
 * `src/modules/webhooks/schemas.ts` — the subscription form's URL and event-type rules. The
 * messages themselves belong to `schemas-i18n.spec.ts`; these are the rules.
 */
import { describe, expect, it } from 'vitest';
import { webhookCreateSchema, webhookEditSchema } from '@/modules/webhooks/schemas';

/** A form payload that passes, for tests that vary one field away from valid. */
const validSubscription = {
    url: 'https://example.com/hook',
    eventTypes: ['order.created']
};

describe('webhookCreateSchema', () => {
    it('accepts a minimal valid subscription', () => {
        expect(webhookCreateSchema.safeParse(validSubscription).success).toBe(true);
    });

    it('accepts an optional description', () => {
        expect(
            webhookCreateSchema.safeParse({ ...validSubscription, description: 'ERP sync' }).success
        ).toBe(true);
    });

    it.each(['not-a-url', 'ftp://example.com', ''])('rejects %o as a url', (url) => {
        expect(webhookCreateSchema.safeParse({ ...validSubscription, url }).success).toBe(false);
    });

    it('rejects a syntactically valid http:// URL — https only', () => {
        expect(
            webhookCreateSchema.safeParse({ ...validSubscription, url: 'http://example.com/hook' })
                .success
        ).toBe(false);
    });

    it('rejects an empty eventTypes array', () => {
        expect(
            webhookCreateSchema.safeParse({ ...validSubscription, eventTypes: [] }).success
        ).toBe(false);
    });

    it('accepts more than one event type', () => {
        expect(
            webhookCreateSchema.safeParse({
                ...validSubscription,
                eventTypes: ['order.created', 'payment.succeeded']
            }).success
        ).toBe(true);
    });
});

describe('webhookEditSchema', () => {
    it('accepts the create fields plus enabled', () => {
        expect(webhookEditSchema.safeParse({ ...validSubscription, enabled: true }).success).toBe(
            true
        );
    });

    it('requires enabled — unlike create, edit always states the current status', () => {
        expect(webhookEditSchema.safeParse(validSubscription).success).toBe(false);
    });
});
