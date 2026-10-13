/**
 * @module
 * What an order's timeline row says, and who may read it. Pure: the caller hands in `t`, the money
 * and date formatters, so the same function serves the component and a plain unit test.
 *
 * Two tables, both checked by the compiler against the contract's `OrderTimelineType`: the audience
 * (mirrors the API, which is the one that enforces it) and the detail each type derives from
 * `data`. A type added to the contract fails to compile until it has a row in both.
 */
import type { OrderTimelineEntry, OrderTimelineType } from '@types';

/**
 * Who a row is for. `staff` rows never reach a buyer, so the staff view flags them: the reader
 * must know what the customer cannot see.
 */
export type TimelineAudience = 'buyer' | 'staff';

/**
 * The audience of every type — the API's own table, read here only to label the staff view.
 */
export const TIMELINE_AUDIENCE: Readonly<Record<OrderTimelineType, TimelineAudience>> = {
    created: 'buyer',
    paid: 'buyer',
    processing: 'buyer',
    shipped: 'buyer',
    delivered: 'buyer',
    cancelled: 'buyer',
    status_overridden: 'staff',
    payment_declined: 'buyer',
    refund_issued: 'buyer',
    refund_settled: 'buyer',
    refund_failed: 'staff',
    shipment_shipped: 'buyer',
    shipment_delivered: 'buyer',
    fulfillment_held: 'staff',
    fulfillment_released: 'staff',
    remainder_cancelled: 'buyer',
    return_requested: 'buyer',
    return_approved: 'buyer',
    return_declined: 'buyer',
    return_received: 'buyer',
    return_closed: 'buyer',
    invoice_issued: 'buyer',
    credit_note_issued: 'buyer',
    release_date_moved: 'buyer',
    delay_notice_sent: 'buyer',
    wait_confirmed: 'buyer',
    wait_expired: 'buyer'
};

/**
 * Whether the buyer never sees a row of this type.
 *
 * @param type - The row's type.
 * @returns `true` for the staff-only types.
 */
export const isStaffOnly = (type: OrderTimelineType): boolean =>
    TIMELINE_AUDIENCE[type] === 'staff';

/**
 * What the line builder needs from the app, injected so this file stays free of Vue and i18n.
 */
export interface TimelineTools {
    /** Translates a message key. */
    t: (key: string, parameters?: Record<string, string>) => string;
    /** Whether a message key exists, for a code the shop may have added (a payment method). */
    has: (key: string) => boolean;
    /** Formats an amount in a currency. */
    money: (amount: number, currency: string) => string;
    /** Formats an ISO date, no time. */
    date: (iso: string) => string;
}

/**
 * One row, ready to show.
 */
export interface TimelineLine {
    /** What happened, in a sentence. */
    title: string;
    /** The specifics (amounts, numbers, codes), joined; absent when the type has none. */
    detail?: string;
}

/**
 * Reads a string out of the free-form `data`.
 *
 * @param data - The row's `data`.
 * @param key - The field.
 * @returns The value when it is a non-empty string.
 */
const textOf = (data: Readonly<Record<string, unknown>>, key: string): string | undefined => {
    const value = data[key];
    return typeof value === 'string' && value !== '' ? value : undefined;
};

/**
 * Translates a closed code through `order-timeline.<group>-<code>`, and shows the raw code when
 * the dictionary has no word for it (a code a newer API added) — readable beats missing.
 *
 * @param tools - The injected helpers.
 * @param key - The message key's prefix, up to and including the trailing dash.
 * @param code - The code from `data`.
 * @returns The label, or the code itself.
 */
const codeLabel = (tools: TimelineTools, key: string, code: string): string =>
    tools.has(`${key}${code}`) ? tools.t(`${key}${code}`) : code;

/**
 * A labelled fragment, `Label: value`, from one `data` field through a code dictionary.
 *
 * @param tools - The injected helpers.
 * @param data - The row's `data`.
 * @param field - The `data` field to read.
 * @param label - Message key of the fragment's label.
 * @param codes - Message key prefix of the field's code dictionary.
 * @returns The fragment, or `undefined` when the field is absent.
 */
const coded = (
    tools: TimelineTools,
    data: Readonly<Record<string, unknown>>,
    field: string,
    label: string,
    codes: string
): string | undefined => {
    const code = textOf(data, field);
    return code === undefined
        ? undefined
        : tools.t(label, { value: codeLabel(tools, codes, code) });
};

/**
 * The refund's amount, when the row carries both halves of it.
 *
 * @param tools - The injected helpers.
 * @param data - The row's `data`.
 * @returns The formatted amount, or `undefined`.
 */
const amountOf = (tools: TimelineTools, data: Readonly<Record<string, unknown>>) => {
    const { amount } = data;
    const currency = textOf(data, 'currency');
    return typeof amount === 'number' && currency ? tools.money(amount, currency) : undefined;
};

/**
 * A `Label: value` fragment for a plain text field (a number, a tracking code).
 *
 * @param tools - The injected helpers.
 * @param data - The row's `data`.
 * @param field - The `data` field to read.
 * @param label - Message key of the fragment's label.
 * @returns The fragment, or `undefined` when the field is absent.
 */
const plain = (
    tools: TimelineTools,
    data: Readonly<Record<string, unknown>>,
    field: string,
    label: string
): string | undefined => {
    const value = textOf(data, field);
    return value === undefined ? undefined : tools.t(label, { value });
};

/**
 * The fragments of one type's detail, in reading order; empties are dropped by the caller.
 */
type DetailBuilder = (
    tools: TimelineTools,
    data: Readonly<Record<string, unknown>>
) => (string | undefined)[];

/**
 * Status `from → to` of a correction, each through the order status labels.
 *
 * @param tools - The injected helpers.
 * @param data - The row's `data`.
 * @returns The one fragment, or none when either end is missing.
 */
const statusMove: DetailBuilder = (tools, data) => {
    const from = textOf(data, 'from');
    const to = textOf(data, 'to');
    return from && to
        ? [
              tools.t('order-timeline.detail-move', {
                  from: codeLabel(tools, 'orders-form.status-', from),
                  to: codeLabel(tools, 'orders-form.status-', to)
              })
          ]
        : [];
};

/**
 * The money and cause of a refund row.
 *
 * @param tools - The injected helpers.
 * @param data - The row's `data`.
 * @returns Amount and reason fragments.
 */
const refundParts: DetailBuilder = (tools, data) => [
    amountOf(tools, data),
    coded(tools, data, 'reason', 'order-timeline.detail-reason', 'order-timeline.refund-reason-')
];

/**
 * The reason code of a return row.
 *
 * @param tools - The injected helpers.
 * @param data - The row's `data`.
 * @returns The reason fragment.
 */
const returnReason: DetailBuilder = (tools, data) => [
    coded(tools, data, 'reason', 'order-timeline.detail-reason', 'order-timeline.return-reason-')
];

/**
 * A document row's number.
 *
 * @param tools - The injected helpers.
 * @param data - The row's `data`.
 * @returns The number fragment.
 */
const documentNumber: DetailBuilder = (tools, data) => [
    plain(tools, data, 'number', 'order-timeline.detail-number')
];

/**
 * A moved release date, as `from → to`; a date that is absent (first date, or cleared) reads as
 * "no date".
 *
 * @param tools - The injected helpers.
 * @param data - The row's `data`.
 * @returns The one fragment.
 */
const dateMove: DetailBuilder = (tools, data) => {
    const dateOf = (field: string): string => {
        const iso = textOf(data, field);
        return iso ? tools.date(iso) : tools.t('order-timeline.date-none');
    };
    return [tools.t('order-timeline.detail-move', { from: dateOf('from'), to: dateOf('to') })];
};

/**
 * What a delay notice told the buyer: the date now expected, and whether silence cancels.
 *
 * @param tools - The injected helpers.
 * @param data - The row's `data`.
 * @returns The expected-date and answer-needed fragments.
 */
const delayNotice: DetailBuilder = (tools, data) => {
    const expected = textOf(data, 'expectedAt');
    return [
        expected
            ? tools.t('order-timeline.detail-expected', { value: tools.date(expected) })
            : undefined,
        data.needsAnswer === true ? tools.t('order-timeline.detail-needs-answer') : undefined
    ];
};

/**
 * The detail of every type that has one. Types absent here say everything in their title.
 */
const DETAILS: Readonly<Partial<Record<OrderTimelineType, DetailBuilder>>> = {
    paid: (tools, data) => [
        coded(
            tools,
            data,
            'method',
            'order-timeline.detail-method',
            'payment-method-selector.method-'
        )
    ],
    delivered: (tools, data) => {
        const until = textOf(data, 'withdrawUntil');
        return [
            until
                ? tools.t('order-timeline.detail-withdraw-until', { value: tools.date(until) })
                : undefined
        ];
    },
    cancelled: (tools, data) => [
        coded(tools, data, 'by', 'order-timeline.detail-by', 'order-timeline.by-')
    ],
    status_overridden: statusMove,
    refund_issued: refundParts,
    refund_settled: refundParts,
    refund_failed: (tools, data) => [
        ...refundParts(tools, data),
        coded(
            tools,
            data,
            'failureReason',
            'order-timeline.detail-failure',
            'order-timeline.failure-reason-'
        )
    ],
    shipment_shipped: (tools, data) => [
        plain(tools, data, 'number', 'order-timeline.detail-shipment'),
        plain(tools, data, 'trackingCode', 'order-timeline.detail-tracking')
    ],
    shipment_delivered: (tools, data) => [
        plain(tools, data, 'number', 'order-timeline.detail-shipment')
    ],
    fulfillment_held: (tools, data) => [
        coded(tools, data, 'reason', 'order-timeline.detail-reason', 'order-timeline.hold-reason-')
    ],
    return_requested: returnReason,
    return_approved: returnReason,
    invoice_issued: documentNumber,
    credit_note_issued: documentNumber,
    release_date_moved: dateMove,
    delay_notice_sent: delayNotice
};

/**
 * Turns one timeline row into the two strings the screen shows.
 *
 * @param entry - The row, as the API sends it.
 * @param tools - The injected translators and formatters.
 * @returns The title, and the detail when the type has any to give.
 */
export const describeTimelineEntry = (
    entry: Pick<OrderTimelineEntry, 'type' | 'data'>,
    tools: TimelineTools
): TimelineLine => {
    const parts = (DETAILS[entry.type]?.(tools, entry.data) ?? []).filter(
        (part): part is string => part !== undefined
    );
    const title = tools.t(`order-timeline.type-${entry.type}`);
    return parts.length > 0 ? { title, detail: parts.join(' · ') } : { title };
};
