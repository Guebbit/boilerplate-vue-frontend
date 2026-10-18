/**
 * @module
 * The Lighthouse cases of the cart: the guest cart and the signed-in checkout, each after one add.
 * Neither is crawled, so neither is SEO-audited. See `docs/tools/lighthouse.md#cases-live-with-modules`.
 */
import { TimeoutError, type Page } from 'puppeteer-core';
import type { LighthouseCase, PrepareContext } from '../../../../tests/support/lighthouse/case';

/**
 * Puts the rich product in the cart the way a shopper does: open its page, press Add.
 *
 * @param page - the case's page
 * @param context - the app origin and the seeded row ids
 */
const addRichProduct = (page: Page, context: PrepareContext): Promise<void> =>
    page
        .goto(`${context.origin}/en/products/${context.subjects['product.rich']}`)
        // Puppeteer: wait for the button the page renders, then press it.
        // https://pptr.dev/api/puppeteer.page.waitforselector
        .then(() => page.waitForSelector('[data-test=add-to-cart]'))
        .then(() => page.click('[data-test=add-to-cart]'))
        // The add is a store write, and a request for a signed-in shopper: wait until the network
        // is quiet. A signed-in page polls (notifications, stock) and may never be quiet, so five
        // seconds without silence counts as settled; any other failure is real.
        // https://pptr.dev/api/puppeteer.page.waitfornetworkidle
        .then(() => page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }))
        .catch((error: unknown) => {
            if (!(error instanceof TimeoutError)) throw error;
        })
        .then(() => undefined);

/** The cases this module contributes. */
export const lighthouseCases: readonly LighthouseCase[] = [
    { name: 'cart/guest', route: '/en/cart', prepare: addRichProduct },
    {
        name: 'cart/checkout',
        route: '/en/cart',
        persona: 'user',
        prepare: addRichProduct
    }
];
