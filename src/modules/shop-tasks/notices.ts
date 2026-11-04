/**
 * @module
 * The notification codes the shop owns, declared as `AppModule.notices` entries: each code says
 * how it reads and which screen it links to, and the shell collects them. The foundation's bell
 * knows none of these codes; it asks the registry.
 *
 * Three shapes: buyer notices (some link to the order), two staff notices that point at a record,
 * and the staff summary rows, which count a list and so link to that list. The summary screens
 * come from `notification-screens.yaml`, the one place that choice is written.
 */
import type { AppNotice, NoticeContext, NoticeTarget } from '@/kernel/registry';
import { SUMMARY_SCREEN_DATA } from './notification-screens.generated';
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
type SummaryCode = keyof typeof SUMMARY_SCREEN_DATA;

/**
 * The target of each summary row's list screen, by the screen kind the generated map names.
 */
const SUMMARY_TARGETS = {
    'sales-orders': { route: 'SalesOrders' },
    payments: { route: 'PaymentsList' },
    returns: { route: 'SalesReturns' },
    preorders: { route: 'PreordersBoard' },
    inventory: { route: 'InventoryLedger' }
} as const satisfies Record<(typeof SUMMARY_SCREEN_DATA)[SummaryCode], NoticeTarget>;

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
 * The entry of a summary row: "{n} things need you", linking to the list the YAML names.
 *
 * @param code - The summary code.
 */
const summaryNotice = (code: SummaryCode): AppNotice => ({
    describe: (notice: ShopNotice<SummaryCode>, { translate }: NoticeContext) =>
        translate(notice.code, { n: notice.params.count }),
    target: () => SUMMARY_TARGETS[SUMMARY_SCREEN_DATA[code]]
});

/**
 * The summary rows' entries, one per code the YAML lists.
 */
const summaryNotices = Object.fromEntries(
    (Object.keys(SUMMARY_SCREEN_DATA) as SummaryCode[]).map((code) => [code, summaryNotice(code)])
);

/**
 * The shop's notice codes, by code.
 */
export const shopNotices: Record<string, AppNotice> = {
    'shop-tasks.cart-line-removed': { describe: describeProduct },
    'shop-tasks.wishlist-item-removed': { describe: describeProduct },
    'shop-tasks.stock-alert': { describe: describeProduct },
    'shop-tasks.cart-merge-refused': { describe: describeMergeRefused },
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
