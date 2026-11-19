/**
 * @module
 * The pure half of the order timeline: the line each type produces from its `data`, the audience
 * table, and the dictionaries that must name every type in both languages. The tools are fakes
 * that echo their key and arguments, so the assertions are about WHAT is said, not the wording.
 */
import { describe, expect, it } from 'vitest';
import { GetOrderTimelineResponse } from '@api/schemas';
import { describeTimelineEntry, exportRefusalOf } from '../domain';
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
    day: (iso) => `day:${iso}`,
    utcDate: (iso) => `utc:${iso}`
};

/**
 * What every row carries whatever its type; a case adds its own `type` and `data` after it.
 */
const row = { id: 'e1', at: '2026-10-01T10:00:00.000Z', audience: 'buyer' } as const;

/**
 * Every type the contract names, read off the generated response schema's variants.
 */
const allTypes: string[] = GetOrderTimelineResponse.shape.items.element.options.flatMap(
    (variant) => variant.shape.type.options
);

/**
 * The ids a shipment row carries, which no case here is about.
 */
const shipment = { shipmentId: 's1', fulfillmentOrderId: 'f1' };

/**
 * The id and currency a refund row carries, which no case here is about.
 */
const refund = { refundId: 'r1', currency: 'EUR' };

/**
 * The fields a delay notice always carries.
 */
const delay = { fulfillmentOrderId: 'f1', reason: 'due' };

describe('describeTimelineEntry', () => {
    it('says which shipment was lost and why, in the reason’s own words', () => {
        expect(
            describeTimelineEntry(
                {
                    ...row,
                    type: 'shipment_lost',
                    data: { ...shipment, number: 2, reason: 'damaged' }
                },
                tools
            ).detail
        ).toBe(
            'order-timeline.detail-shipment(2) · order-timeline.detail-reason(order-timeline.lost-reason-damaged)'
        );
    });

    it('says a lost parcel refunded in full, and stays silent about causes it has no wording for', () => {
        expect(
            describeTimelineEntry(
                { ...row, type: 'canceled', data: { by: 'system', cause: 'lost', refund: false } },
                tools
            ).detail
        ).toBe('order-timeline.detail-by(order-timeline.by-system) · order-timeline.cause-lost');
        expect(
            describeTimelineEntry(
                {
                    ...row,
                    type: 'canceled',
                    data: { by: 'system', cause: 'erasure', refund: false }
                },
                // The dictionary has no sentence for this cause.
                { ...tools, has: (key) => key !== 'order-timeline.cause-erasure' }
            ).detail
        ).toBe('order-timeline.detail-by(order-timeline.by-system)');
    });

    it('gives every type a title and no detail when it has no data to add', () => {
        expect(describeTimelineEntry({ ...row, type: 'processing', data: {} }, tools)).toEqual({
            title: 'order-timeline.type-processing'
        });
    });

    it('names the payment method through the method labels the shop already has', () => {
        expect(
            describeTimelineEntry({ ...row, type: 'paid', data: { method: 'card' } }, tools).detail
        ).toBe('order-timeline.detail-method(payment-method-selector.method-card)');
    });

    it('joins the amount and the reason of a refund', () => {
        const line = describeTimelineEntry(
            {
                ...row,
                type: 'refund_settled',
                data: { ...refund, amount: '12.50', reason: 'goodwill' }
            },
            tools
        );

        expect(line.detail).toBe(
            '12.50 EUR · order-timeline.detail-reason(order-timeline.refund-reason-goodwill)'
        );
    });

    it('adds why a refund failed, for staff', () => {
        const line = describeTimelineEntry(
            {
                ...row,
                type: 'refund_failed',
                data: { ...refund, amount: '5.00', reason: 'return', failureReason: 'declined' }
            },
            tools
        );

        expect(line.detail).toContain('order-timeline.failure-reason-declined');
    });

    it('shows the amount and reason of a refund staff canceled', () => {
        const line = describeTimelineEntry(
            {
                ...row,
                type: 'refund_canceled',
                data: { ...refund, amount: '5.00', reason: 'goodwill' }
            },
            tools
        );

        expect(line.detail).toContain('5.00 EUR');
    });

    it('shows what a dispute disputes and where it stands, for staff', () => {
        const line = describeTimelineEntry(
            {
                ...row,
                type: 'dispute_opened',
                data: {
                    disputeId: 'dp_1',
                    kind: 'chargeback',
                    amount: '40.00',
                    currency: 'EUR',
                    status: 'needs_response',
                    reason: 'fraudulent'
                }
            },
            tools
        );

        expect(line.title).toBe('order-timeline.type-dispute_opened');
        expect(line.detail).toBe(
            '40.00 EUR · order-timeline.detail-dispute(order-timeline.dispute-status-needs_response) · order-timeline.detail-reason(order-timeline.dispute-reason-fraudulent)'
        );
    });

    it('shows a code the dictionary does not know as it is', () => {
        const line = describeTimelineEntry(
            { ...row, type: 'fulfillment_held', data: { reason: 'unknown_new_code' } },
            tools
        );

        expect(line.detail).toBe('order-timeline.detail-reason(unknown_new_code)');
    });

    it('shows a correction as from and to', () => {
        const line = describeTimelineEntry(
            {
                ...row,
                type: 'status_overridden',
                data: { mode: 'status', from: 'paid', to: 'shipped' }
            },
            tools
        );

        expect(line.detail).toBe(
            'order-timeline.detail-move(orders-form.status-paid,orders-form.status-shipped)'
        );
    });

    it('formats the withdrawal deadline as the UTC day it names', () => {
        const line = describeTimelineEntry(
            { ...row, type: 'delivered', data: { withdrawUntil: '2026-10-30T00:00:00.000Z' } },
            tools
        );

        expect(line.detail).toBe(
            'order-timeline.detail-withdraw-until(utc:2026-10-30T00:00:00.000Z)'
        );
    });

    it('lists the parcel number and tracking code, skipping a missing code', () => {
        const withCode = describeTimelineEntry(
            {
                ...row,
                type: 'shipment_shipped',
                data: { ...shipment, number: 1, trackingCode: 'T9' }
            },
            tools
        );
        const without = describeTimelineEntry(
            { ...row, type: 'shipment_shipped', data: { ...shipment, number: 1 } },
            tools
        );

        expect(withCode.detail).toBe(
            'order-timeline.detail-shipment(1) · order-timeline.detail-tracking(T9)'
        );
        expect(without.detail).toBe('order-timeline.detail-shipment(1)');
    });

    it('prints the number of a document', () => {
        expect(
            describeTimelineEntry(
                { ...row, type: 'invoice_issued', data: { invoiceId: 'i1', number: 'INV-1' } },
                tools
            ).detail
        ).toBe('order-timeline.detail-number(INV-1)');
    });

    it('prints the new invoice and the credit note that cancelled the old one on a correction', () => {
        expect(
            describeTimelineEntry(
                {
                    ...row,
                    type: 'invoice_corrected',
                    data: {
                        invoiceId: 'i2',
                        number: 'INV-2',
                        creditNoteId: 'c1',
                        creditNoteNumber: 'CN-1'
                    }
                },
                tools
            ).detail
        ).toBe('order-timeline.detail-number(INV-2) · order-timeline.detail-cancelled-by(CN-1)');
    });
});

describe('the preorder rows', () => {
    it('shows a moved date as from and to, and a missing end as no date', () => {
        const moved = describeTimelineEntry(
            {
                ...row,
                type: 'release_date_moved',
                data: { fulfillmentOrderId: 'f1', from: '2026-11-01' }
            },
            tools
        );

        expect(moved.detail).toBe(
            'order-timeline.detail-move(day:2026-11-01,order-timeline.date-none)'
        );
    });

    it('shows the date a notice promised', () => {
        const notice = describeTimelineEntry(
            { ...row, type: 'delay_notice_sent', data: { ...delay, expectedAt: '2026-12-01' } },
            tools
        );

        expect(notice.detail).toBe('order-timeline.detail-expected(day:2026-12-01)');
    });

    it('shows no detail on a notice that named no new date', () => {
        expect(
            describeTimelineEntry({ ...row, type: 'delay_notice_sent', data: delay }, tools).detail
        ).toBeUndefined();
    });
});

describe('timeline dictionaries', () => {
    it.each([
        ['en', enMessages],
        ['it', itMessages]
    ])('names every type in %s', (_name, messages) => {
        const dictionary = messages['order-timeline'] as Record<string, string>;

        for (const type of allTypes) expect(Object.keys(dictionary)).toContain(`type-${type}`);
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
