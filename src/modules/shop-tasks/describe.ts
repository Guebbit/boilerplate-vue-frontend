/**
 * @module
 * The shop's notification sentences, built from a code's `params`. Pure: the caller hands in the
 * translate function and the reader's languages, and gets text back.
 *
 * The server stores no text, only a code and the facts that sentence needs. A product name arrives
 * as `titles`, a locale-to-name map copied in at write time, because the notification outlives the
 * product it is about.
 */
import type { Notification, ProductTitles } from '@types';
import type { NoticeContext } from '@/kernel/registry';

/**
 * The contract's variant for one shop code, so a builder's `params` are typed per code.
 */
export type ShopNotice<TCode extends Notification['code']> = Extract<Notification, { code: TCode }>;

/**
 * Dictionary key for the name of a product whose `titles` are empty.
 */
const UNKNOWN_PRODUCT_KEY = 'shop-tasks.unknown-product';

/**
 * Dictionary key for a refused merge that lists no line.
 */
const MERGE_REFUSED_BARE_KEY = 'shop-tasks.cart-merge-refused-bare';

/**
 * Separator between the refused lines of one merge sentence.
 */
const LINE_SEPARATOR = '; ';

/**
 * Separator between the product names of one sentence.
 */
const NAME_SEPARATOR = ', ';

/**
 * A product's name in the reader's language.
 *
 * The first language in `preferred` that has a name wins; failing that, whichever name exists,
 * since any real name beats none. Only an empty map falls through to the generic wording.
 *
 * @param titles - Locale to name, as stored on the notification.
 * @param context - Languages to try (best first) and the translate function for the fallback.
 * @returns The name to print.
 */
export const productName = (
    titles: ProductTitles,
    { preferred, translate }: Pick<NoticeContext, 'preferred' | 'translate'>
): string => {
    const wanted = preferred.map((locale) => titles[locale]).find(Boolean);
    const anyTitle = Object.values(titles).find((title) => title !== '');
    return wanted ?? anyTitle ?? translate(UNKNOWN_PRODUCT_KEY);
};

/**
 * The sentence of a notice that names one product and nothing else: a cart line or wishlist item
 * that vanished, or a stock alert.
 *
 * @param notice - The notice.
 * @param context - Languages and translate function.
 * @returns The finished text.
 */
export const describeProduct = (
    notice: ShopNotice<
        | 'shop-tasks.cart-line-removed'
        | 'shop-tasks.wishlist-item-removed'
        | 'shop-tasks.stock-alert'
    >,
    context: NoticeContext
): string => context.translate(notice.code, { name: productName(notice.params.titles, context) });

/**
 * The sentence of a guest-cart merge that refused lines: one "Collar × 2" per line, or the bare
 * sentence when none is listed. The line layout is a dictionary entry, since word order is the
 * language's business.
 *
 * @param notice - The notice.
 * @param context - Languages and translate function.
 * @returns The finished text.
 */
export const describeMergeRefused = (
    notice: ShopNotice<'shop-tasks.cart-merge-refused'>,
    context: NoticeContext
): string => {
    const lines = notice.params.lines.map((line) =>
        context.translate('shop-tasks.refused-line', {
            name: productName(line.titles, context),
            requested: line.requested
        })
    );
    return lines.length === 0
        ? context.translate(MERGE_REFUSED_BARE_KEY)
        : context.translate(notice.code, { lines: lines.join(LINE_SEPARATOR) });
};

/**
 * The sentence of a late preorder's notice: the new date, or that there is none yet. The notice
 * asks nothing: the reader can cancel from the order, and doing nothing keeps them waiting.
 *
 * @param notice - The notice.
 * @param context - Translate function and date spelling.
 * @returns The finished text.
 */
export const describePreorder = (
    notice: ShopNotice<'shop-tasks.fulfillment-delayed'>,
    { translate, formatDate }: NoticeContext
): string => {
    const { params } = notice;
    return translate(
        params.expectedAt === undefined
            ? 'shop-tasks.fulfillment-delayed-undated'
            : 'shop-tasks.fulfillment-delayed',
        {
            titles: params.titles.join(NAME_SEPARATOR),
            agreed: formatDate(params.agreedAt),
            expected: params.expectedAt === undefined ? '' : formatDate(params.expectedAt)
        }
    );
};

/**
 * The hold notice's two sentences and the shop's message line, as literals so the unused-key check
 * can see them.
 */
const HELD_KEYS = {
    check_address: 'shop-tasks.fulfillment-held-check_address',
    delayed: 'shop-tasks.fulfillment-held-delayed',
    message: 'shop-tasks.fulfillment-held-message'
};

/**
 * The sentence of a hold the buyer can act on or should read: what the notice means, then what
 * the shop wrote for them. Never a reason: the server does not send one.
 *
 * @param notice - The notice.
 * @param context - Translate function.
 * @returns The finished text.
 */
export const describeHeld = (
    notice: ShopNotice<'shop-tasks.fulfillment-held'>,
    { translate }: NoticeContext
): string => {
    const { params } = notice;
    const sentence = translate(HELD_KEYS[params.notice]);
    return params.message
        ? `${sentence} ${translate(HELD_KEYS.message, { message: params.message })}`
        : sentence;
};

/**
 * The lost-parcel notice's sentences and its two optional lines, as literals so the unused-key
 * check can see them.
 */
const LOST_KEYS = {
    lost: 'shop-tasks.shipment-lost-lost',
    damaged: 'shop-tasks.shipment-lost-damaged',
    owed: 'shop-tasks.shipment-lost-owed',
    message: 'shop-tasks.shipment-lost-message'
};

/**
 * The sentence of a parcel reported lost or damaged: what happened, what is still owed and when
 * (only when the shelf could not cover it), then what the shop wrote for the buyer.
 *
 * @param notice - The notice.
 * @param context - Translate function and date spelling.
 * @returns The finished text.
 */
export const describeLost = (
    notice: ShopNotice<'shop-tasks.shipment-lost'>,
    { translate, formatDate }: NoticeContext
): string => {
    const { params } = notice;
    return [
        translate(LOST_KEYS[params.reason]),
        params.owed && params.expectedAt
            ? translate(LOST_KEYS.owed, {
                  titles: params.owed.join(NAME_SEPARATOR),
                  expected: formatDate(params.expectedAt)
              })
            : undefined,
        params.message ? translate(LOST_KEYS.message, { message: params.message }) : undefined
    ]
        .filter((part): part is string => part !== undefined)
        .join(' ');
};
