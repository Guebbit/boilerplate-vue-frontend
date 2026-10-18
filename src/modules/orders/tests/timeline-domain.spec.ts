/**
 * @module
 * The pure half of the order timeline: the line each type produces from its `data`, the audience
 * table, and the dictionaries that must name every type in both languages. The tools are fakes
 * that echo their key and arguments, so the assertions are about WHAT is said, not the wording.
 */
import { describe, expect, it } from 'vitest';
import { OrderTimelineType } from '@api';
import { describeTimelineEntry, isStaffOnly, exportRefusalOf } from '../domain';
import type { TimelineTools } from '../domain';
import enMessages from '../locales/en.json';
import itMessages from '../locales/it.json';

/**
 * Tools that print `key(value, ...)` and know every key but `unknown.*`.
 */
const tools: TimelineTools = {
    t: (key, parameters) => (parameters ? `${key}(${Object.values(parameters).join(',')})` : key),
    has: (key) => !key.includes('unknown'),
    money: (amount, currency) => `${amount} ${currency}`,
    date: (iso) => `date:${iso}`
};

describe('describeTimelineEntry', () => {
    it('gives every type a title and no detail when it has no data to add', () => {
        expect(describeTimelineEntry({ type: 'processing', data: {} }, tools)).toEqual({
            title: 'order-timeline.type-processing'
        });
    });

    it('names the payment method through the method labels the shop already has', () => {
        expect(
            describeTimelineEntry({ type: 'paid', data: { method: 'card' } }, tools).detail
        ).toBe('order-timeline.detail-method(payment-method-selector.method-card)');
    });

    it('joins the amount and the reason of a refund', () => {
        const line = describeTimelineEntry(
            { type: 'refund_settled', data: { amount: 12.5, currency: 'EUR', reason: 'goodwill' } },
            tools
        );

        expect(line.detail).toBe(
            '12.5 EUR · order-timeline.detail-reason(order-timeline.refund-reason-goodwill)'
        );
    });

    it('adds why a refund failed, for staff', () => {
        const line = describeTimelineEntry(
            {
                type: 'refund_failed',
                data: { amount: 5, currency: 'EUR', reason: 'return', failureReason: 'declined' }
            },
            tools
        );

        expect(line.detail).toContain('order-timeline.failure-reason-declined');
    });

    it('shows a code the dictionary does not know as it is', () => {
        const line = describeTimelineEntry(
            { type: 'fulfillment_held', data: { reason: 'unknown_new_code' } },
            tools
        );

        expect(line.detail).toBe('order-timeline.detail-reason(unknown_new_code)');
    });

    it('shows a correction as from and to', () => {
        const line = describeTimelineEntry(
            { type: 'status_overridden', data: { mode: 'status', from: 'paid', to: 'shipped' } },
            tools
        );

        expect(line.detail).toBe(
            'order-timeline.detail-move(orders-form.status-paid,orders-form.status-shipped)'
        );
    });

    it('formats the withdrawal deadline as a date', () => {
        const line = describeTimelineEntry(
            { type: 'delivered', data: { withdrawUntil: '2026-10-30T00:00:00.000Z' } },
            tools
        );

        expect(line.detail).toBe(
            'order-timeline.detail-withdraw-until(date:2026-10-30T00:00:00.000Z)'
        );
    });

    it('lists the parcel number and tracking code, skipping a missing code', () => {
        const withCode = describeTimelineEntry(
            { type: 'shipment_shipped', data: { number: 'S-1', trackingCode: 'T9' } },
            tools
        );
        const without = describeTimelineEntry(
            { type: 'shipment_shipped', data: { number: 'S-1' } },
            tools
        );

        expect(withCode.detail).toBe(
            'order-timeline.detail-shipment(S-1) · order-timeline.detail-tracking(T9)'
        );
        expect(without.detail).toBe('order-timeline.detail-shipment(S-1)');
    });

    it('prints the number of a document', () => {
        expect(
            describeTimelineEntry({ type: 'invoice_issued', data: { number: 'INV-1' } }, tools)
                .detail
        ).toBe('order-timeline.detail-number(INV-1)');
    });
});

describe('the preorder rows', () => {
    it('shows a moved date as from and to, and a missing end as no date', () => {
        const moved = describeTimelineEntry(
            { type: 'release_date_moved', data: { from: '2026-11-01T00:00:00.000Z', to: null } },
            tools
        );

        expect(moved.detail).toBe(
            'order-timeline.detail-move(date:2026-11-01T00:00:00.000Z,order-timeline.date-none)'
        );
    });

    it('shows the date a notice promised, and that an answer is owed', () => {
        const notice = describeTimelineEntry(
            {
                type: 'delay_notice_sent',
                data: { expectedAt: '2026-12-01T00:00:00.000Z', needsAnswer: true }
            },
            tools
        );

        expect(notice.detail).toBe(
            'order-timeline.detail-expected(date:2026-12-01T00:00:00.000Z) · order-timeline.detail-needs-answer'
        );
    });

    it('gives the two answers a title and no detail', () => {
        expect(
            describeTimelineEntry({ type: 'wait_confirmed', data: {} }, tools).detail
        ).toBeUndefined();
        expect(
            describeTimelineEntry({ type: 'wait_expired', data: {} }, tools).detail
        ).toBeUndefined();
    });
});

describe('isStaffOnly', () => {
    it('flags exactly the five types the buyer never sees', () => {
        const staffOnly = Object.values(OrderTimelineType).filter((type) => isStaffOnly(type));

        expect(staffOnly.toSorted()).toEqual([
            'address_corrected',
            'fulfillment_held',
            'fulfillment_released',
            'refund_failed',
            'status_overridden'
        ]);
    });
});

describe('timeline dictionaries', () => {
    it.each([
        ['en', enMessages],
        ['it', itMessages]
    ])('names every type in %s', (_name, messages) => {
        const dictionary = messages['order-timeline'] as Record<string, string>;

        for (const type of Object.values(OrderTimelineType))
            expect(Object.keys(dictionary)).toContain(`type-${type}`);
    });

    it('keeps the Italian wording apart from the English', () => {
        expect(itMessages['order-timeline']['type-paid']).not.toBe(
            enMessages['order-timeline']['type-paid']
        );
    });
});

describe('exportRefusalOf', () => {
    it('reads a 429 as the spent budget', () => {
        expect(exportRefusalOf({ status: 429, errors: [] })).toBe('rate-limited');
    });

    it('reads a 422 with the export code as too large', () => {
        expect(exportRefusalOf({ status: 422, errors: [{ code: 'ORDER_EXPORT_TOO_LARGE' }] })).toBe(
            'too-large'
        );
    });

    it('leaves a 422 with another code, and anything else, to the generic message', () => {
        expect(exportRefusalOf({ status: 422, errors: [{ code: 'VALIDATION' }] })).toBeUndefined();
        expect(exportRefusalOf({ status: 500 })).toBeUndefined();
        expect(exportRefusalOf(undefined)).toBeUndefined();
    });
});
