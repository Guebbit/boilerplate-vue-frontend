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
 * @returns The finished text. A code this client does not know (a newer backend) reads as a
 *  generic notification, never as its key.
 */
export const describeNotification = (
    notification: DescribableNotification,
    preferred: readonly string[],
    translate: Translate
): string => {
    switch (notification.code) {
        case 'notifications.cart-line-removed':
        case 'notifications.wishlist-item-removed': {
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
        default: {
            return translate(UNKNOWN_CODE_KEY);
        }
    }
};
