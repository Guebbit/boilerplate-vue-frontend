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
 * A notification's `params` for the preorder codes: what is late, and when.
 */
type PreorderParameters = Extract<
    DescribableNotification,
    { code: 'notifications.fulfillment-delayed' | 'notifications.fulfillment-confirm-wait' }
>['params'];

/**
 * Each preorder code's two dictionary entries, as literals so the unused-key check can see them:
 * the full sentence, and the one for a notice whose optional date is missing (`expectedAt` for the
 * delayed notice, `answerBy` for the confirm-wait one).
 */
const PREORDER_KEYS = {
    'notifications.fulfillment-delayed': {
        full: 'notifications.fulfillment-delayed',
        withoutDate: 'notifications.fulfillment-delayed-undated'
    },
    'notifications.fulfillment-confirm-wait': {
        full: 'notifications.fulfillment-confirm-wait',
        withoutDate: 'notifications.fulfillment-confirm-wait-bare'
    }
};

/**
 * The sentence of a preorder's late notice: the delayed notice says the new date (or that there is
 * none yet), the confirm-wait notice asks for an answer by its deadline (or without one).
 *
 * @param code - Which of the two preorder codes.
 * @param parameters - The notice's facts.
 * @param format - Date spelling.
 * @param translate - The translate function.
 * @returns The finished text.
 */
const describePreorder = (
    code: 'notifications.fulfillment-delayed' | 'notifications.fulfillment-confirm-wait',
    parameters: PreorderParameters,
    format: FormatDate,
    translate: Translate
): string => {
    const named = {
        titles: parameters.titles.join(NAME_SEPARATOR),
        agreed: format(parameters.agreedAt),
        expected: parameters.expectedAt === undefined ? '' : format(parameters.expectedAt),
        answerBy: parameters.answerBy === undefined ? '' : format(parameters.answerBy)
    };
    const keys = PREORDER_KEYS[code];
    const dateMissing =
        code === 'notifications.fulfillment-delayed'
            ? parameters.expectedAt === undefined
            : parameters.answerBy === undefined;
    return translate(dateMissing ? keys.withoutDate : keys.full, named);
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
 * The order a notification is about, when it is about one — where the reader answers or cancels.
 *
 * @param notification - The stored row's `code` and `params`.
 * @returns The order id, or `undefined` for a notification that concerns no order.
 */
export const notificationOrderId = (notification: DescribableNotification): string | undefined =>
    notification.code === 'notifications.fulfillment-delayed' ||
    notification.code === 'notifications.fulfillment-confirm-wait' ||
    notification.code === 'notifications.fulfillment-held'
        ? notification.params.orderId
        : undefined;

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
        case 'notifications.fulfillment-delayed':
        case 'notifications.fulfillment-confirm-wait': {
            return describePreorder(notification.code, notification.params, formatDate, translate);
        }
        case 'notifications.fulfillment-held': {
            return describeHeld(notification.params, translate);
        }
        default: {
            return translate(UNKNOWN_CODE_KEY);
        }
    }
};
