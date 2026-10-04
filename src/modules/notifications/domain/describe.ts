/**
 * @module
 * Turns a stored notification (`code` + `params`) into the sentence the reader sees. Pure: the
 * caller hands in the translate function and the reader's language preference, and gets text back.
 *
 * The server stores no text, only a code and the facts that sentence needs. A product name arrives
 * as `titles`, a locale-to-name map copied in at write time, because the notification outlives the
 * product it is about.
 */
import * as zod from 'zod';
import type { Notification } from '@types';

/**
 * The slice of vue-i18n's `t` this file needs: a key, plus named values to interpolate.
 */
export type Translate = (key: string, named?: Record<string, unknown>) => string;

/**
 * A notification as far as its sentence is concerned.
 */
export type DescribableNotification = Pick<Notification, 'code' | 'params'>;

/**
 * Locale to product name, as the server copied it into `params.titles`. A value that is not a
 * map of strings reads as an empty one: a malformed row still gets a sentence, just not a name.
 */
const titlesSchema = zod.record(zod.string(), zod.string()).catch({});

/**
 * `params` of a cart-line or wishlist-item notification.
 */
const removedParametersSchema = zod.object({ titles: titlesSchema }).catch({ titles: {} });

/**
 * `params` of a refused guest-cart merge: the lines the merge could not add, each with its reason.
 * A line that is not an object with a string reason is dropped rather than failing the whole row.
 */
const mergeRefusedParametersSchema = zod
    .object({
        lines: zod.array(
            zod.object({ titles: titlesSchema, reason: zod.string() }).nullable().catch(null)
        )
    })
    .catch({ lines: [] });

/**
 * Reasons a merged line can be refused, mapped to their dictionary key. A reason this client does
 * not know (a newer backend) gets {@link UNKNOWN_REASON_KEY}.
 */
const REASON_KEYS: Record<string, string> = {
    unavailable: 'notifications.reason-unavailable',
    'quantity-limit': 'notifications.reason-quantity-limit'
};

/**
 * Dictionary key for a refusal reason this client has no wording for.
 */
const UNKNOWN_REASON_KEY = 'notifications.reason-unknown';

/**
 * Dictionary key for a code this client has no wording for (a newer backend).
 */
const UNKNOWN_CODE_KEY = 'notifications.unknown';

/**
 * Dictionary key for the name of a product whose `titles` are empty.
 */
const UNKNOWN_PRODUCT_KEY = 'notifications.unknown-product';

/**
 * Dictionary key for a refused merge whose lines could not be read at all.
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
    titles: Record<string, string>,
    preferred: readonly string[],
    translate: Translate
): string => {
    const wanted = preferred.map((locale) => titles[locale]).find(Boolean);
    const anyTitle = Object.values(titles).find((title) => title !== '');
    return wanted ?? anyTitle ?? translate(UNKNOWN_PRODUCT_KEY);
};

/**
 * One refused line as it reads inside the merge sentence, e.g. "Collar (no longer available)".
 * The layout is a dictionary entry, since word order and brackets are the language's business.
 *
 * @param line - The line's names and why it was refused.
 * @param preferred - Languages to try for the name.
 * @param translate - The translate function.
 * @returns The line's text.
 */
const refusedLine = (
    line: { titles: Record<string, string>; reason: string },
    preferred: readonly string[],
    translate: Translate
): string =>
    translate('notifications.refused-line', {
        name: productName(line.titles, preferred, translate),
        reason: translate(REASON_KEYS[line.reason] ?? UNKNOWN_REASON_KEY)
    });

/**
 * The sentence for a refused guest-cart merge.
 *
 * @param parameters - The row's raw `params`.
 * @param preferred - Languages to try for each name.
 * @param translate - The translate function.
 * @returns The sentence, listing the refused lines when any could be read.
 */
const mergeRefusedText = (
    parameters: unknown,
    preferred: readonly string[],
    translate: Translate
): string => {
    const lines = mergeRefusedParametersSchema
        .parse(parameters)
        .lines.filter((line) => line !== null)
        .map((line) => refusedLine(line, preferred, translate));
    return lines.length === 0
        ? translate(MERGE_REFUSED_BARE_KEY)
        : translate('notifications.cart-merge-refused', { lines: lines.join(LINE_SEPARATOR) });
};

/**
 * The sentence for a product that left the catalogue and so left one of the reader's lists.
 *
 * @param code - The notification's code, which is also its dictionary key.
 * @param parameters - The row's raw `params`.
 * @param preferred - Languages to try for the name.
 * @param translate - The translate function.
 * @returns The sentence.
 */
const removedText = (
    code: string,
    parameters: unknown,
    preferred: readonly string[],
    translate: Translate
): string => {
    const { titles } = removedParametersSchema.parse(parameters);
    return translate(code, { name: productName(titles, preferred, translate) });
};

/**
 * The sentence a notification reads as, in the reader's language.
 *
 * @param notification - The stored row's `code` and `params`.
 * @param preferred - Languages to try for a product name, best first: the reader's, then the
 *  shop's main one.
 * @param translate - The translate function; the code is its own dictionary key.
 * @returns The finished text. An unknown code reads as a generic notification, never as its key.
 */
export const describeNotification = (
    { code, params }: DescribableNotification,
    preferred: readonly string[],
    translate: Translate
): string => {
    switch (code) {
        case 'notifications.cart-line-removed':
        case 'notifications.wishlist-item-removed': {
            return removedText(code, params, preferred, translate);
        }
        case 'notifications.cart-merge-refused': {
            return mergeRefusedText(params, preferred, translate);
        }
        default: {
            return translate(UNKNOWN_CODE_KEY);
        }
    }
};
