/**
 * @module
 * Turns a stored notification (`code` + `params`) into the sentence the reader sees. Pure: the
 * caller hands in the translate function and the reader's language preference, and gets text back.
 *
 * The server stores no text, only a code and the facts that sentence needs. A product name arrives
 * as `titles`, a locale-to-name map copied in at write time, because the notification outlives the
 * product it is about. The contract types `params` per code, so the `switch` below narrows them.
 */
import type { Notification, ProductTitles } from '@types';
import { SUMMARY_SCREEN_DATA } from './notification-screens.generated';

/**
 * The slice of vue-i18n's `t` this file needs: a key, plus named values to interpolate.
 */
export type Translate = (key: string, named?: Record<string, unknown>) => string;

/**
 * A notification as far as its sentence is concerned: each variant's `code` still paired with its
 * own `params`, so a `switch` on the code narrows the params with it. `Pick` on the union itself
 * would split the pair apart; mapping over the variants keeps it.
 */
export type DescribableNotification = Notification extends infer Variant
    ? Variant extends Notification
        ? Pick<Variant, 'code' | 'params'>
        : never
    : never;

/**
 * How a date is spelled in a sentence. Handed in by the caller, since the format is the reader's
 * locale and this layer knows no locale machinery.
 */
export type FormatDate = (iso: string) => string;

/**
 * Dictionary key for a code this client has no wording for (a newer backend).
 */
const UNKNOWN_CODE_KEY = 'notifications.unknown';

/**
 * Dictionary key for the name of a product whose `titles` are empty.
 */
const UNKNOWN_PRODUCT_KEY = 'notifications.unknown-product';

/**
 * Dictionary key for a refused merge that lists no line.
 */
const MERGE_REFUSED_BARE_KEY = 'notifications.cart-merge-refused-bare';

/**
 * Separator between the refused lines of one merge sentence.
 */
const LINE_SEPARATOR = '; ';

/**
 * Separator between the product names of one preorder sentence.
 */
const NAME_SEPARATOR = ', ';

/**
 * A notification's `params` for the late-preorder code: what is late, and when.
 */
type PreorderParameters = Extract<
    DescribableNotification,
    { code: 'notifications.fulfillment-delayed' }
>['params'];

/**
 * The sentence of a late preorder's notice: the new date, or that there is none yet. The notice
 * asks nothing: the reader can cancel from the order, and doing nothing keeps them waiting.
 *
 * @param parameters - The notice's facts.
 * @param format - Date spelling.
 * @param translate - The translate function.
 * @returns The finished text.
 */
const describePreorder = (
    parameters: PreorderParameters,
    format: FormatDate,
    translate: Translate
): string => {
    const named = {
        titles: parameters.titles.join(NAME_SEPARATOR),
        agreed: format(parameters.agreedAt),
        expected: parameters.expectedAt === undefined ? '' : format(parameters.expectedAt)
    };
    return translate(
        parameters.expectedAt === undefined
            ? 'notifications.fulfillment-delayed-undated'
            : 'notifications.fulfillment-delayed',
        named
    );
};

/**
 * The hold notice's two sentences and the shop's message line, as literals so the unused-key check
 * can see them.
 */
const HELD_KEYS = {
    check_address: 'notifications.fulfillment-held-check_address',
    delayed: 'notifications.fulfillment-held-delayed',
    message: 'notifications.fulfillment-held-message'
};

/**
 * The sentence of a hold the buyer can act on or should read: what the notice means, then what
 * the shop wrote for them. Never a reason: the server does not send one.
 *
 * @param parameters - The notice's facts.
 * @param translate - The translate function.
 * @returns The finished text.
 */
const describeHeld = (
    parameters: Extract<
        DescribableNotification,
        { code: 'notifications.fulfillment-held' }
    >['params'],
    translate: Translate
): string => {
    const sentence = translate(HELD_KEYS[parameters.notice]);
    return parameters.message
        ? `${sentence} ${translate(HELD_KEYS.message, { message: parameters.message })}`
        : sentence;
};

/**
 * The lost-parcel notice's sentences and its two optional lines, as literals so the unused-key
 * check can see them.
 */
const LOST_KEYS = {
    lost: 'notifications.shipment-lost-lost',
    damaged: 'notifications.shipment-lost-damaged',
    owed: 'notifications.shipment-lost-owed',
    message: 'notifications.shipment-lost-message'
};

/**
 * The sentence of a parcel reported lost or damaged: what happened, what is still owed and when
 * (only when the shelf could not cover it), then what the shop wrote for the buyer.
 *
 * @param parameters - The notice's facts.
 * @param format - Date spelling.
 * @param translate - The translate function.
 * @returns The finished text.
 */
const describeLost = (
    parameters: Extract<DescribableNotification, { code: 'notifications.shipment-lost' }>['params'],
    format: FormatDate,
    translate: Translate
): string =>
    [
        translate(LOST_KEYS[parameters.reason]),
        parameters.owed && parameters.expectedAt
            ? translate(LOST_KEYS.owed, {
                  titles: parameters.owed.join(NAME_SEPARATOR),
                  expected: format(parameters.expectedAt)
              })
            : undefined,
        parameters.message
            ? translate(LOST_KEYS.message, { message: parameters.message })
            : undefined
    ]
        .filter((part): part is string => part !== undefined)
        .join(' ');

/**
 * The dictionary entry of each ticket kind, as literals so the unused-key check can see them. A
 * kind this client does not know (a newer backend) reads as {@link TICKET_KIND_UNKNOWN_KEY}.
 */
const TICKET_KIND_KEYS: Readonly<Record<string, string>> = {
    contact: 'notifications.staff-ticket-kind-contact',
    account_review: 'notifications.staff-ticket-kind-account_review',
    manual_refund_owed: 'notifications.staff-ticket-kind-manual_refund_owed',
    amount_mismatch: 'notifications.staff-ticket-kind-amount_mismatch',
    paid_without_hold: 'notifications.staff-ticket-kind-paid_without_hold',
    export_failed: 'notifications.staff-ticket-kind-export_failed',
    consent_due: 'notifications.staff-ticket-kind-consent_due',
    refund_refused: 'notifications.staff-ticket-kind-refund_refused',
    dispute: 'notifications.staff-ticket-kind-dispute'
};

/**
 * Dictionary key for a ticket kind this client has no word for.
 */
const TICKET_KIND_UNKNOWN_KEY = 'notifications.staff-ticket-kind-unknown';

/**
 * The dictionary entry of each contact category, as literals for the same reason. `none` is a
 * message the visitor sent without one.
 */
const TICKET_CATEGORY_KEYS: Readonly<Record<string, string>> = {
    order: 'notifications.staff-ticket-category-order',
    cancellation: 'notifications.staff-ticket-category-cancellation',
    return: 'notifications.staff-ticket-category-return',
    payment: 'notifications.staff-ticket-category-payment',
    account: 'notifications.staff-ticket-category-account',
    privacy: 'notifications.staff-ticket-category-privacy',
    other: 'notifications.staff-ticket-category-other',
    none: 'notifications.staff-ticket-category-none'
};

/**
 * The sentence of a ticket notice: what kind of ticket, and for a contact message its category.
 * Kind and category are closed codes the server sends; their words are this client's own.
 *
 * @param code - Which of the three ticket notices.
 * @param parameters - The notice's facts.
 * @param parameters.kind - The ticket's kind.
 * @param parameters.category - A contact ticket's category, when the visitor chose one.
 * @param translate - The translate function.
 * @returns The finished text.
 */
const describeTicket = (
    code:
        | 'notifications.staff.ticket-opened'
        | 'notifications.staff.ticket-overdue'
        | 'notifications.staff.ticket-assigned',
    parameters: { kind: string; category?: string },
    translate: Translate
): string => {
    const kind = translate(TICKET_KIND_KEYS[parameters.kind] ?? TICKET_KIND_UNKNOWN_KEY);
    const category = translate(
        TICKET_CATEGORY_KEYS[parameters.category ?? 'none'] ?? TICKET_CATEGORY_KEYS.none
    );
    return translate(code, {
        what: parameters.kind === 'contact' ? `${kind} · ${category}` : kind
    });
};

/**
 * The order a notification is about, when it is about one — where the reader can cancel.
 *
 * @param notification - The stored row's `code` and `params`.
 * @returns The order id, or `undefined` for a notification that concerns no order.
 */
export const notificationOrderId = (notification: DescribableNotification): string | undefined =>
    notification.code === 'notifications.fulfillment-delayed' ||
    notification.code === 'notifications.fulfillment-held' ||
    notification.code === 'notifications.shipment-lost'
        ? notification.params.orderId
        : undefined;

/**
 * Where a notification points inside the admin: which kind of screen, and the id it shows. A
 * kind, not a route name: naming a sibling's route is the link composable's job, next to the
 * `hasRoute` guard that makes it safe.
 */
export type NotificationTarget =
    | {
          /**
           * A record's own page: a buyer's account, a webhook subscription, a ticket, a return or
           * an order.
           */
          screen: 'account' | 'webhook-subscription' | 'ticket' | 'return' | 'order';
          /**
           * The id of that record.
           */
          id: string;
      }
    | {
          /**
           * A list a summary row counts: sales orders, payments, returns, the preorder board or
           * the stock ledger. The row carries a count, not an id.
           */
          screen: 'sales-orders' | 'payments' | 'returns' | 'preorders' | 'inventory';
      };

/**
 * The screen of the record a parked event was about, read off the event name's first segment. An
 * event of another kind has no screen here: a link to a guess would be worse than none.
 *
 * @param eventName - The parked event (`order.paid`).
 * @param aggregateId - What it was about.
 * @returns The target, or `undefined` for an event about neither an order nor an account.
 */
const outboxTarget = (eventName: string, aggregateId: string): NotificationTarget | undefined => {
    const [kind] = eventName.split('.');
    if (kind === 'order') return { screen: 'order', id: aggregateId };
    if (kind === 'user') return { screen: 'account', id: aggregateId };
    return undefined;
};

/**
 * The admin screen a work notice is about: the buyer's account for a purchase hold, the
 * subscription for a disabled webhook, the ticket for an opened, overdue or assigned one. Own messages point at none here (an order is
 * {@link notificationOrderId}'s job).
 *
 * @param notification - The stored row's `code` and `params`.
 * @returns The screen, or `undefined` for a notification that is not a work notice.
 */
export const notificationTarget = (
    notification: DescribableNotification
): NotificationTarget | undefined => {
    switch (notification.code) {
        case 'notifications.staff.purchase-hold-placed': {
            return { screen: 'account', id: notification.params.userId };
        }
        case 'notifications.staff.webhook-disabled': {
            return { screen: 'webhook-subscription', id: notification.params.subscriptionId };
        }
        case 'notifications.staff.ticket-opened':
        case 'notifications.staff.ticket-overdue':
        case 'notifications.staff.ticket-assigned': {
            return { screen: 'ticket', id: notification.params.ticketId };
        }
        case 'notifications.staff.return-requested': {
            return { screen: 'return', id: notification.params.returnId };
        }
        case 'notifications.staff.outbox-dead': {
            return outboxTarget(notification.params.eventName, notification.params.aggregateId);
        }
        case 'notifications.staff.transfers-due':
        case 'notifications.staff.preorders-late':
        case 'notifications.staff.delivery-holds-open':
        case 'notifications.staff.withdrawals-awaiting-goods':
        case 'notifications.staff.returns-undecided':
        case 'notifications.staff.low-stock':
        case 'notifications.staff.unshipped':
        case 'notifications.staff.awaiting-tracking':
        case 'notifications.staff.undelivered':
        case 'notifications.staff.stale-refunds': {
            return { screen: SUMMARY_SCREEN_DATA[notification.code] };
        }
        default: {
            return undefined;
        }
    }
};

/**
 * A product's name in the reader's language.
 *
 * The first language in `preferred` that has a name wins; failing that, whichever name exists,
 * since any real name beats none. Only an empty map falls through to the generic wording.
 *
 * @param titles - Locale to name, as stored on the notification.
 * @param preferred - Languages to try, best first: the reader's, then the shop's main one.
 * @param translate - The translate function, for the generic fallback.
 * @returns The name to print.
 */
export const productName = (
    titles: ProductTitles,
    preferred: readonly string[],
    translate: Translate
): string => {
    const wanted = preferred.map((locale) => titles[locale]).find(Boolean);
    const anyTitle = Object.values(titles).find((title) => title !== '');
    return wanted ?? anyTitle ?? translate(UNKNOWN_PRODUCT_KEY);
};

/**
 * One line of the refused-merge sentence, e.g. "Collar × 2". The layout is a dictionary entry,
 * since word order is the language's business.
 *
 * @param line - The refused line.
 * @param line.titles - Locale to product name.
 * @param line.requested - How many the guest cart held.
 * @param preferred - Languages to try for the name.
 * @param translate - The translate function.
 * @returns The line's text.
 */
const refusedLine = (
    line: { titles: ProductTitles; requested: number },
    preferred: readonly string[],
    translate: Translate
): string =>
    translate('notifications.refused-line', {
        name: productName(line.titles, preferred, translate),
        requested: line.requested
    });

/**
 * The sentence a notification reads as, in the reader's language.
 *
 * @param notification - The stored row's `code` and `params`.
 * @param preferred - Languages to try for a product name, best first: the reader's, then the
 *  shop's main one.
 * @param translate - The translate function; the code is its own dictionary key.
 * @param formatDate - How a date reads in the sentence; the ISO string itself by default.
 * @returns The finished text. A code this client does not know (a newer backend) reads as a
 *  generic notification, never as its key.
 */
export const describeNotification = (
    notification: DescribableNotification,
    preferred: readonly string[],
    translate: Translate,
    formatDate: FormatDate = (iso) => iso
): string => {
    switch (notification.code) {
        case 'notifications.cart-line-removed':
        case 'notifications.wishlist-item-removed':
        case 'notifications.stock-alert': {
            return translate(notification.code, {
                name: productName(notification.params.titles, preferred, translate)
            });
        }
        case 'notifications.cart-merge-refused': {
            const lines = notification.params.lines.map((line) =>
                refusedLine(line, preferred, translate)
            );
            return lines.length === 0
                ? translate(MERGE_REFUSED_BARE_KEY)
                : translate(notification.code, { lines: lines.join(LINE_SEPARATOR) });
        }
        case 'notifications.fulfillment-delayed': {
            return describePreorder(notification.params, formatDate, translate);
        }
        case 'notifications.fulfillment-held': {
            return describeHeld(notification.params, translate);
        }
        case 'notifications.shipment-lost': {
            return describeLost(notification.params, formatDate, translate);
        }
        case 'notifications.staff.purchase-hold-placed': {
            return translate(notification.code, { until: formatDate(notification.params.until) });
        }
        case 'notifications.staff.webhook-disabled':
        case 'notifications.staff.return-requested': {
            return translate(notification.code);
        }
        case 'notifications.staff.outbox-dead': {
            return translate(notification.code, { event: notification.params.eventName });
        }
        case 'notifications.staff.transfers-due':
        case 'notifications.staff.preorders-late':
        case 'notifications.staff.delivery-holds-open':
        case 'notifications.staff.withdrawals-awaiting-goods':
        case 'notifications.staff.returns-undecided':
        case 'notifications.staff.low-stock':
        case 'notifications.staff.unshipped':
        case 'notifications.staff.awaiting-tracking':
        case 'notifications.staff.undelivered':
        case 'notifications.staff.stale-refunds': {
            return translate(notification.code, { n: notification.params.count });
        }
        case 'notifications.staff.ticket-opened':
        case 'notifications.staff.ticket-overdue':
        case 'notifications.staff.ticket-assigned': {
            return describeTicket(notification.code, notification.params, translate);
        }
        default: {
            return translate(UNKNOWN_CODE_KEY);
        }
    }
};
