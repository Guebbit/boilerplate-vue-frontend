/**
 * @module
 * The delivery log's rows carry a `data-test` of their own, with the event type in view — what a
 * spec reads to say "a delivery for `order.created` exists" without asserting on its status
 * (which stays `pending` where no broker runs).
 */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm';
import WebhookDeliveriesFilters from '@/modules/webhooks/components/WebhookDeliveriesFilters.vue';
import { i18n } from '@/i18n';
import vuetify from '@/ui/vuetify';
import type { WebhookDelivery } from '@types';

/** Builds one delivery row; every field the contract requires, the rest left absent. */
const delivery = (id: string, eventType: string): WebhookDelivery => ({
    id,
    subscriptionId: 'sub-1',
    eventId: `evt-${id}`,
    eventType,
    attempt: 1,
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
});

describe('WebhookDeliveriesFilters rows', () => {
    it('puts `webhook-delivery-row` on every row, event type included', async () => {
        const wrapper = mount(WebhookDeliveriesFilters, {
            props: {
                deliveries: [delivery('d1', 'order.created'), delivery('d2', 'order.paid')],
                total: 2,
                pages: 1,
                loading: false,
                subscriptions: [],
                replayingIds: new Set<string>()
            },
            global: { plugins: [vuetify, i18n] }
        });
        await nextRenderTick(wrapper);

        const rows = wrapper.findAll('[data-test=webhook-delivery-row]');
        expect(rows).toHaveLength(2);
        expect(rows[0].text()).toContain('order.created');
        expect(rows[1].text()).toContain('order.paid');
    });
});
