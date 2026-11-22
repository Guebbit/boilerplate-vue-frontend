/**
 * @module
 * What an order's timeline row says. Pure: the caller hands in `t`, the money
 * and date formatters, so the same function serves the component and a plain unit test.
 *
 * One table, a mapped type over the contract's types: each type's detail reads the `data` shape
 * the contract gives THAT type, so a field renamed or retyped in the contract fails to compile
 * here. Who may read a row is the server's call, sent as `entry.audience`.
 */
import type { OrderTimelineEntry } from '@types';

/**
 * Every type a row can have: the union of the variants' own `type` enums.
 */
export type OrderTimelineType = OrderTimelineEntry['type'];

/**
 * The `data` the contract gives one type. Distributive over the variants: a type that several
 * variants could share still answers with its own (`Extract` would give `never` for a variant
 * whose `type` is a subset of a wider enum).
 */
type DataOf<T extends OrderTimelineType> = OrderTimelineEntry extends infer TVariant
    ? TVariant extends { type: infer TTypes; data: infer TData }
        ? T extends TTypes
            ? TData
            : never
        : never
    : never;

/**
 * What the line builder needs from the app, injected so this file stays free of Vue and i18n.
 */
export interface TimelineTools {
    /** Translates a message key. */
    t: (key: string, parameters?: Record<string, string>) => string;
    /** Whether a message key exists, for a code the shop may have added (a payment method). */
    has: (key: string) => boolean;
    /** Formats an amount in a currency. */
    money: (amount: string, currency: string) => string;
    /** Formats a `YYYY-MM-DD` shop day, no time and no zone shift: a promised date. */
    day: (iso: string) => string;
    /** Formats an ISO date, no time, as the UTC day it names: the withdrawal deadline. */
    utcDate: (iso: string) => string;
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
 * A closed code through `order-timeline.<group>-<code>`, shown raw when the dictionary has no word
 * for it (a code a newer API added) — readable beats missing.
 *
 * @param tools - The injected helpers.
 * @param key - The message key's prefix, up to and including the trailing dash.
 * @param code - The code from `data`.
 * @returns The label, or the code itself.
 */
const codeLabel = (tools: TimelineTools, key: string, code: string): string =>
    tools.has(`${key}${code}`) ? tools.t(`${key}${code}`) : code;

/**
 * A labelled fragment, `Label: value`, from one code through a code dictionary.
 *
 * @param tools - The injected helpers.
 * @param code - The code from `data`; absent gives no fragment.
 * @param label - Message key of the fragment's label.
 * @param codes - Message key prefix of the code dictionary.
 * @returns The fragment, or `undefined` when the code is absent.
 */
const coded = (
    tools: TimelineTools,
    code: string | undefined,
    label: string,
    codes: string
): string | undefined =>
    code === undefined ? undefined : tools.t(label, { value: codeLabel(tools, codes, code) });

/**
 * A `Label: value` fragment for a plain field (a number, a tracking code).
 *
 * @param tools - The injected helpers.
 * @param value - The field; absent gives no fragment.
 * @param label - Message key of the fragment's label.
 * @returns The fragment, or `undefined` when the field is absent.
 */
const plain = (
    tools: TimelineTools,
    value: string | number | undefined,
    label: string
): string | undefined =>
    value === undefined ? undefined : tools.t(label, { value: String(value) });

/**
 * The cancel's cause as a sentence of its own, only for a cause the dictionary words: the ordinary
 * causes are already told by who canceled (`by`), so showing their raw codes would only add noise.
 *
 * @param tools - The injected helpers.
 * @param cause - The cancel's cause code.
 * @returns The cause sentence, or `undefined` when the cause has no wording.
 */
const causeNote = (tools: TimelineTools, cause: string): string | undefined =>
    tools.has(`order-timeline.cause-${cause}`)
        ? tools.t(`order-timeline.cause-${cause}`)
        : undefined;

/**
 * The fragments of one type's detail, in reading order, from that type's own `data`; empties are
 * dropped by the caller.
 */
type DetailBuilder<TData> = (tools: TimelineTools, data: TData) => (string | undefined)[];

/**
 * The money of a row that carries both halves of it.
 *
 * @param tools - The injected helpers.
 * @param money - The row's `amount` and `currency`.
 * @returns The formatted amount.
 */
const amountOf = (
    tools: TimelineTools,
    { amount, currency }: { amount: string; currency: string }
): string => tools.money(amount, currency);

/**
 * Status `from → to` of a correction, each through the order status labels.
 *
 * @param tools - The injected helpers.
 * @param data - The override's `from` and `to`.
 * @returns The one fragment.
 */
const statusMove: DetailBuilder<DataOf<'status_overridden'>> = (tools, { from, to }) => [
    tools.t('order-timeline.detail-move', {
        from: codeLabel(tools, 'orders-form.status-', from),
        to: codeLabel(tools, 'orders-form.status-', to)
    })
];

/**
 * The money and cause of a refund row.
 *
 * @param tools - The injected helpers.
 * @param data - The refund row's data.
 * @returns Amount and reason fragments.
 */
const refundParts: DetailBuilder<DataOf<'refund_issued'>> = (tools, data) => [
    amountOf(tools, data),
    coded(tools, data.reason, 'order-timeline.detail-reason', 'order-timeline.refund-reason-')
];

/**
 * The money and state of a dispute row: how much the bank disputes, and where it stands.
 *
 * @param tools - The injected helpers.
 * @param data - The dispute row's data.
 * @returns Amount, state and reason fragments.
 */
const disputeParts: DetailBuilder<DataOf<'dispute_opened'>> = (tools, data) => [
    amountOf(tools, data),
    coded(tools, data.status, 'order-timeline.detail-dispute', 'order-timeline.dispute-status-'),
    coded(tools, data.reason, 'order-timeline.detail-reason', 'order-timeline.dispute-reason-')
];

/**
 * The reason code of a return row, when it carries one.
 *
 * @param tools - The injected helpers.
 * @param data - The return row's data.
 * @returns The reason fragment.
 */
const returnReason: DetailBuilder<{ reason?: string | undefined }> = (tools, { reason }) => [
    coded(tools, reason, 'order-timeline.detail-reason', 'order-timeline.return-reason-')
];

/**
 * A document row's number.
 *
 * @param tools - The injected helpers.
 * @param data - The document row's data.
 * @returns The number fragment.
 */
const documentNumber: DetailBuilder<{ number: string }> = (tools, { number }) => [
    plain(tools, number, 'order-timeline.detail-number')
];

/**
 * A moved release date, as `from → to`; a date that is absent (first date, or cleared) reads as
 * "no date".
 *
 * @param tools - The injected helpers.
 * @param data - The row's `from` and `to` shop days.
 * @returns The one fragment.
 */
const dateMove: DetailBuilder<DataOf<'release_date_moved'>> = (tools, { from, to }) => {
    const dayOf = (iso: string | undefined): string =>
        iso === undefined ? tools.t('order-timeline.date-none') : tools.day(iso);
    return [tools.t('order-timeline.detail-move', { from: dayOf(from), to: dayOf(to) })];
};

/**
 * What a delay notice told the buyer: the date now expected.
 *
 * @param tools - The injected helpers.
 * @returns The expected-date fragment.
 */
const delayNotice: DetailBuilder<DataOf<'delay_notice_sent'>> = (tools, { expectedAt }) => [
    expectedAt === undefined
        ? undefined
        : tools.t('order-timeline.detail-expected', { value: tools.day(expectedAt) })
];

/**
 * The detail of every type that has one. Types absent here say everything in their title.
 */
const DETAILS: { readonly [T in OrderTimelineType]?: DetailBuilder<DataOf<T>> } = {
    paid: (tools, { method }) => [
        coded(tools, method, 'order-timeline.detail-method', 'payment-method-selector.method-')
    ],
    delivered: (tools, { withdrawUntil }) => [
        tools.t('order-timeline.detail-withdraw-until', { value: tools.utcDate(withdrawUntil) })
    ],
    canceled: (tools, { by, cause }) => [
        coded(tools, by, 'order-timeline.detail-by', 'order-timeline.by-'),
        causeNote(tools, cause)
    ],
    status_overridden: statusMove,
    refund_issued: refundParts,
    refund_settled: refundParts,
    refund_canceled: refundParts,
    refund_failed: (tools, data) => [
        ...refundParts(tools, data),
        coded(
            tools,
            data.failureReason,
            'order-timeline.detail-failure',
            'order-timeline.failure-reason-'
        )
    ],
    dispute_opened: disputeParts,
    dispute_closed: disputeParts,
    shipment_shipped: (tools, { number, trackingCode }) => [
        plain(tools, number, 'order-timeline.detail-shipment'),
        plain(tools, trackingCode, 'order-timeline.detail-tracking')
    ],
    shipment_delivered: (tools, { number }) => [
        plain(tools, number, 'order-timeline.detail-shipment')
    ],
    shipment_lost: (tools, { number, reason }) => [
        plain(tools, number, 'order-timeline.detail-shipment'),
        coded(tools, reason, 'order-timeline.detail-reason', 'order-timeline.lost-reason-')
    ],
    fulfillment_held: (tools, { reason }) => [
        coded(tools, reason, 'order-timeline.detail-reason', 'order-timeline.hold-reason-')
    ],
    return_requested: returnReason,
    return_approved: returnReason,
    invoice_issued: documentNumber,
    credit_note_issued: documentNumber,
    invoice_corrected: (tools, { number, creditNoteNumber }) => [
        plain(tools, number, 'order-timeline.detail-number'),
        plain(tools, creditNoteNumber, 'order-timeline.detail-cancelled-by')
    ],
    release_date_moved: dateMove,
    delay_notice_sent: delayNotice
};

/**
 * One type's detail fragments. Generic in the type so `DETAILS[type]` and `data` stay paired:
 * indexing the mapped table by a generic key gives that key's own builder.
 *
 * @param type - The row's type.
 * @param data - That type's `data`.
 * @param tools - The injected helpers.
 * @returns The fragments, none when the type has no detail.
 */
const detailsOf = <T extends OrderTimelineType>(
    type: T,
    data: DataOf<T>,
    tools: TimelineTools
): (string | undefined)[] => DETAILS[type]?.(tools, data) ?? [];

/**
 * Turns one timeline row into the two strings the screen shows.
 *
 * @param entry - The row, as the API sends it.
 * @param tools - The injected translators and formatters.
 * @returns The title, and the detail when the type has any to give.
 */
export const describeTimelineEntry = (
    entry: OrderTimelineEntry,
    tools: TimelineTools
): TimelineLine => {
    const parts = detailsOf(entry.type, entry.data, tools).filter(
        (part): part is string => part !== undefined
    );
    const title = tools.t(`order-timeline.type-${entry.type}`);
    return parts.length > 0 ? { title, detail: parts.join(' · ') } : { title };
};
