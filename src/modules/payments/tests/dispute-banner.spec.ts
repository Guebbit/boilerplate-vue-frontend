/**
 * @module
 * `DisputeBanner` and `OrderDisputes`: what the buyer's bank did to a payment, as staff read it —
 * the kind, where it stands, the reason, the money, the evidence deadline and the way out to the
 * provider's dashboard. The server decides who sees `disputes`; the banner renders what it is given.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DisputeBanner from '../components/DisputeBanner.vue';
import OrderDisputes from '../components/OrderDisputes.vue';
import { usePaymentsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aPayment } from '../../../../tests/support/unit/fixtures.ts';
import type { Dispute } from '@types';

wireModulesIntoCore();

/** A chargeback waiting for the shop's evidence, overridable per case. */
const aDispute = (overrides: Partial<Dispute> = {}): Dispute => ({
    disputeRef: 'dp_1',
    kind: 'chargeback',
    status: 'needs_response',
    reason: 'product_not_received',
    amount: 40,
    currency: 'EUR',
    fundsWithdrawn: true,
    openedAt: '2026-03-05T10:00:00Z',
    observedAt: '2026-03-05T10:00:00Z',
    ...overrides
});

/** Mounts the banner on some disputes. */
const mountBanner = (disputes: Dispute[]) =>
    mount(DisputeBanner, { props: { disputes }, global: { plugins: [vuetify, i18n] } });

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('DisputeBanner', () => {
    it('renders nothing when there is no dispute', () => {
        expect(mountBanner([]).find('[data-test="dispute-banner"]').exists()).toBe(false);
    });

    it('names the kind, the state, the amount and the reason', () => {
        const wrapper = mountBanner([aDispute()]);

        const alert = wrapper.get('[data-test="dispute-dp_1"]');
        expect(alert.get('[data-test="dispute-title"]').text()).toBe(
            'Chargeback: the bank took the money back'
        );
        expect(alert.get('[data-test="dispute-status"]').text()).toBe('Waiting for your evidence');
        expect(alert.text()).toContain('Amount: €40.00');
        expect(alert.text()).toContain('The buyer says the goods did not arrive');
    });

    it('counts the days left to send evidence, and says how late once it has passed', () => {
        const inTwoDays = new Date(Date.now() + 2 * 86_400_000 - 3_600_000).toISOString();
        const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000 - 3_600_000).toISOString();

        const open = mountBanner([aDispute({ evidenceDueBy: inTwoDays })]);
        const late = mountBanner([aDispute({ evidenceDueBy: twoDaysAgo })]);

        expect(open.get('[data-test="dispute-due"]').text()).toContain('2 days left to answer');
        expect(late.get('[data-test="dispute-due"]').text()).toContain(
            'The deadline passed 2 days ago'
        );
    });

    it('says refunds are paused while a chargeback is open, but not for a question or a decided one', () => {
        const chargeback = mountBanner([aDispute()]);
        const question = mountBanner([aDispute({ kind: 'inquiry', fundsWithdrawn: false })]);
        const decided = mountBanner([aDispute({ status: 'won', fundsWithdrawn: false })]);

        expect(chargeback.find('[data-test="dispute-refunds-paused"]').exists()).toBe(true);
        expect(question.find('[data-test="dispute-refunds-paused"]').exists()).toBe(false);
        expect(decided.find('[data-test="dispute-refunds-paused"]').exists()).toBe(false);
        expect(decided.get('[data-test="dispute-status"]').text()).toBe(
            "Decided in the shop's favour"
        );
    });

    it('asks for no deadline once the shop has sent its evidence', () => {
        const wrapper = mountBanner([
            aDispute({ status: 'under_review', evidenceDueBy: '2030-01-01T00:00:00Z' })
        ]);

        expect(wrapper.find('[data-test="dispute-due"]').exists()).toBe(false);
    });

    it('links to the provider dashboard only for an https address', () => {
        const safe = mountBanner([aDispute({ dashboardUrl: 'https://dashboard.example/dp_1' })]);
        const unsafe = mountBanner([aDispute({ dashboardUrl: 'javascript:alert(1)' })]);

        const link = safe.get('[data-test="dispute-dashboard"]');
        expect(link.attributes('href')).toBe('https://dashboard.example/dp_1');
        expect(link.attributes('rel')).toBe('noopener noreferrer');
        expect(unsafe.find('[data-test="dispute-dashboard"]').exists()).toBe(false);
    });
});

describe('OrderDisputes', () => {
    it('shows the disputes of the payment read for this order only', () => {
        const store = usePaymentsStore();
        store.payment = aPayment({ orderId: 'o1', disputes: [aDispute()] });

        const mine = mount(OrderDisputes, {
            props: { orderId: 'o1' },
            global: { plugins: [vuetify, i18n] }
        });
        const other = mount(OrderDisputes, {
            props: { orderId: 'o2' },
            global: { plugins: [vuetify, i18n] }
        });

        expect(mine.find('[data-test="dispute-banner"]').exists()).toBe(true);
        expect(other.find('[data-test="dispute-banner"]').exists()).toBe(false);
    });
});
