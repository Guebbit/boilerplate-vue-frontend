/**
 * @module
 * The backend links into this router from mail and from its sitemap. This walks every one of those
 * paths (`contracts/frontend-links.yaml`, handed over by `sync:frontend`) against the real router,
 * so a renamed route fails here instead of as a 404 in a reader's inbox.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import { enabledModules } from '@/modules';

/**
 * The router's guards are not under test: `resolve` never runs them, but importing the router
 * pulls the modules in, so the two it imports at load are stubbed as `router.spec.ts` stubs them.
 */
vi.mock('@/app/guards/authentications.ts', () => ({
    tryRestoreAuth: () => Promise.resolve(),
    enforceRouteAccess: () => undefined
}));
vi.mock('@/infrastructure/observability/store.ts', () => ({
    useObservabilityStore: () => ({ captureException: vi.fn() })
}));

/** The parsed `contracts/frontend-links.yaml`. */
const rules = parse(
    readFileSync(path.join(process.cwd(), 'contracts', 'frontend-links.yaml'), 'utf8')
) as {
    links: Record<string, string>;
    staffPages: Record<string, string>;
    staticPages: string[];
};

/** The modules this build serves; a link into a module this build left out has no page to find. */
const served = new Set(enabledModules.map(({ name }) => name));

/**
 * The module that owns the page of each backend link, where it is not a core one. The backend
 * hands over every link the full build knows, so a build without that module skips the row
 * instead of failing on a page it never had. A key missing from this table is core: it must
 * resolve, so a new link cannot slip past the check by being left off.
 */
const OWNER: Record<string, string> = {
    order: 'orders',
    product: 'products',
    products: 'products',
    return: 'returns',
    inventory: 'inventory',
    salesPayments: 'payments',
    transfersDue: 'payments',
    staleRefunds: 'payments',
    preordersLate: 'inventory',
    lowStock: 'inventory',
    deliveryHoldsOpen: 'orders',
    unshipped: 'orders',
    awaitingTracking: 'orders',
    undelivered: 'orders',
    returnsAwaitingGoods: 'returns',
    returnsProofGoodsLate: 'returns',
    returnsUndecided: 'returns'
};

/**
 * Whether the build serves the module a link key belongs to.
 *
 * @param key - the key in `links:` or `staffPages:`, or a static page path
 */
const isServed = (key: string): boolean => {
    const owner = OWNER[key];
    return owner === undefined || served.has(owner);
};

/** Pay for the router's module graph once, outside any test's budget (see `router.spec.ts`). */
beforeAll(async () => {
    await import('@/app/router');
}, 60_000);

/**
 * Whether `/en/<template>` lands on a real page, not on a catch-all.
 * @param template - a backend link template, with `{id}` / `{token}` placeholders
 */
const resolvesToAPage = async (template: string): Promise<boolean> => {
    const { default: router } = await import('@/app/router');
    // The fragment and the query are the reader's business; only the path has to exist.
    const [route] = template.replaceAll(/\{\w+\}/g, 'x').split(/[#?]/, 1);
    const resolved = router.resolve(route ? `/en/${route}` : '/en');
    return (
        resolved.matched.length > 0 &&
        resolved.matched.every((record) => !record.path.includes('catchAll'))
    );
};

describe('backend links resolve on the router', () => {
    it('every link template is a real page', async () => {
        const kinds = Object.keys(rules.links).filter((key) => isServed(key));
        expect(kinds.length).toBeGreaterThan(0);
        for (const kind of kinds)
            expect([kind, await resolvesToAPage(rules.links[kind])]).toEqual([kind, true]);
    });

    it('every staff screen a notice mail links to is a real page', async () => {
        const kinds = Object.keys(rules.staffPages).filter((key) => isServed(key));
        expect(kinds.length).toBeGreaterThan(0);
        for (const kind of kinds)
            expect([kind, await resolvesToAPage(rules.staffPages[kind])]).toEqual([kind, true]);
    });

    it('every static sitemap page is a real page', async () => {
        const pages = rules.staticPages.filter((page) => isServed(page));
        expect(pages.length).toBeGreaterThan(0);
        for (const page of pages) expect([page, await resolvesToAPage(page)]).toEqual([page, true]);
    });
});

/**
 * The text of one source file of the app.
 *
 * @param file - path under `src/modules/`
 */
const sourceOf = (file: string): string =>
    readFileSync(path.join(process.cwd(), 'src', 'modules', file), 'utf8');

/**
 * Where each filtered staff summary path is read: the list's view, the text that declares each
 * query key it opens on, and the values the filter accepts.
 */
const SUMMARY_READERS: Record<string, { file: string; declares: string[]; accepts: string[] }> = {
    transfersDue: {
        file: 'payments/views/PaymentsList.vue',
        declares: ['route.query.tab', "'awaiting'"],
        accepts: []
    },
    preordersLate: {
        file: 'inventory/views/PreordersBoard.vue',
        declares: ['route.query.tab', "'orders'"],
        accepts: []
    },
    deliveryHoldsOpen: {
        file: 'orders/views/OrdersList.vue',
        declares: ['fulfillmentStatus:'],
        accepts: ['on_hold']
    },
    returnsAwaitingGoods: {
        file: 'returns/views/ReturnsList.vue',
        declares: ['status:', "proofOfSending: 'boolean'"],
        accepts: ['approved', 'false']
    },
    returnsProofGoodsLate: {
        file: 'returns/views/ReturnsList.vue',
        declares: ['status:', "proofOfSending: 'boolean'"],
        accepts: ['approved', 'true']
    },
    returnsUndecided: {
        file: 'returns/views/ReturnsList.vue',
        declares: ['status:'],
        accepts: ['requested']
    },
    lowStock: {
        file: 'inventory/components/StockBoard.vue',
        declares: ["lowOnly: 'boolean'", "prefix: 'levels'"],
        accepts: []
    },
    unshipped: {
        file: 'orders/views/OrdersList.vue',
        declares: ['fulfillmentStatus:', 'deleted:'],
        accepts: ['awaiting_shipment', 'false']
    },
    awaitingTracking: {
        file: 'orders/views/OrdersList.vue',
        declares: ['status:'],
        accepts: ['shipped']
    },
    undelivered: {
        file: 'orders/views/OrdersList.vue',
        declares: ['status:'],
        accepts: ['shipped']
    },
    staleRefunds: {
        file: 'payments/views/PaymentsList.vue',
        declares: ['route.query.tab', "'attention'"],
        accepts: []
    }
};

describe('the staff summary paths open the filtered list', () => {
    it('lists a reader for every summary path, so a new row cannot skip this check', () => {
        const summaryKeys = Object.keys(rules.staffPages).filter(
            (key) => rules.staffPages[key].includes('?') && isServed(key)
        );
        const readers = Object.keys(SUMMARY_READERS).filter((key) => isServed(key));
        expect(summaryKeys.toSorted()).toEqual(readers.toSorted());
    });

    it.each(Object.entries(SUMMARY_READERS).filter(([key]) => isServed(key)))(
        '%s: the list reads the query keys and values the path sets',
        (key, reader) => {
            const source = sourceOf(reader.file);
            const query = new URLSearchParams(rules.staffPages[key].split('?', 2)[1]);

            expect(query.size).toBeGreaterThan(0);
            for (const text of reader.declares) expect(source).toContain(text);
            // A value the path sets that the enum no longer has would open an unfiltered list.
            for (const value of reader.accepts) expect([...query.values()]).toContain(value);
        }
    );
});
