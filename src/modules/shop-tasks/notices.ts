/**
 * @module
 * The notification codes the shop owns, declared as `AppModule.notices` entries: each code says
 * how it reads and which screen it links to, and the shell collects them. The foundation's bell
 * knows none of these codes; it asks the registry.
 *
 * Three shapes: buyer notices (some link to the order), two staff notices that point at a record,
 * and the staff summary rows, which count a list and so link to that list. The backend names the
 * filtered list in each row's `params.work`, the one copy of that choice (the digest mail uses it too).
 */
import type { AppNotice, NoticeContext, NoticeTarget } from '@/kernel/registry';
import {
    describeHeld,
    describeLost,
    describeMergeRefused,
    describePreorder,
    describeProduct
} from './describe';
import type { ShopNotice } from './describe';

/**
 * The code of every staff summary row: a count and no id.
 */
const SUMMARY_CODES = [
    'shop-tasks.staff.transfers-due',
    'shop-tasks.staff.preorders-late',
    'shop-tasks.staff.delivery-holds-open',
    'shop-tasks.staff.withdrawals-awaiting-goods',
    'shop-tasks.staff.returns-undecided',
    'shop-tasks.staff.low-stock',
    'shop-tasks.staff.unshipped',
    'shop-tasks.staff.awaiting-tracking',
    'shop-tasks.staff.undelivered',
    'shop-tasks.staff.stale-refunds'
] as const;

/**
 * One of the staff summary codes.
 */
type SummaryCode = (typeof SUMMARY_CODES)[number];

/**
 * Where a buyer notice about an order links: the order's page.
 *
 * @param notice - The notice.
 */
const orderTarget = (
    notice: ShopNotice<
        | 'shop-tasks.fulfillment-delayed'
        | 'shop-tasks.fulfillment-held'
        | 'shop-tasks.shipment-lost'
    >
): NoticeTarget => ({ route: 'OrderTarget', params: { id: notice.params.orderId } });

/**
 * The entry of a summary row: "{n} things need you", linking to the filtered list the server named.
 */
const summaryNotice: AppNotice = {
    describe: (notice: ShopNotice<SummaryCode>, { translate }: NoticeContext) =>
        translate(notice.code, { n: notice.params.count }),
    target: (notice: ShopNotice<SummaryCode>) => ({ path: notice.params.work })
};

/**
 * The summary rows' entries, one per summary code.
 */
const summaryNotices = Object.fromEntries(SUMMARY_CODES.map((code) => [code, summaryNotice]));

/**
 * The shop's notice codes, by code.
 */
export const shopNotices: Record<string, AppNotice> = {
    // The product is gone, so a product link would 404: the cart is where the buyer acts next.
    'shop-tasks.cart-line-removed': {
        describe: describeProduct,
        target: () => ({ route: 'Cart' })
    },
    'shop-tasks.wishlist-item-removed': {
        describe: describeProduct,
        target: () => ({ route: 'Wishlist' })
    },
    // The product is buyable when the alert fires, so its page is the one to open.
    'shop-tasks.stock-alert': {
        describe: describeProduct,
        target: (notice: ShopNotice<'shop-tasks.stock-alert'>) => ({
            route: 'ProductTarget',
            params: { id: notice.params.productId }
        })
    },
    // The merge rewrote the cart; the buyer checks what survived.
    'shop-tasks.cart-merge-refused': {
        describe: describeMergeRefused,
        target: () => ({ route: 'Cart' })
    },
    'shop-tasks.fulfillment-delayed': { describe: describePreorder, target: orderTarget },
    'shop-tasks.fulfillment-held': { describe: describeHeld, target: orderTarget },
    'shop-tasks.shipment-lost': { describe: describeLost, target: orderTarget },
    'shop-tasks.staff.purchase-hold-placed': {
        describe: (
            notice: ShopNotice<'shop-tasks.staff.purchase-hold-placed'>,
            { translate, formatDate }
        ) => translate(notice.code, { until: formatDate(notice.params.until) }),
        target: (notice: ShopNotice<'shop-tasks.staff.purchase-hold-placed'>) => ({
            route: 'UserTarget',
            params: { id: notice.params.userId }
        })
    },
    'shop-tasks.staff.return-requested': {
        describe: (notice, { translate }) => translate(notice.code),
        target: (notice: ShopNotice<'shop-tasks.staff.return-requested'>) => ({
            route: 'ReturnTarget',
            params: { id: notice.params.returnId }
        })
    },
    ...summaryNotices
};
