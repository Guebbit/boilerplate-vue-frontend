/**
 * @module
 * The Lighthouse cases of the catalogue: the list and one product page, both public and both
 * crawlable. How they are run: `docs/tools/lighthouse.md#cases-live-with-modules`.
 */
import type { LighthouseCase } from '../../../../tests/support/lighthouse/case';

/** The cases this module contributes. */
export const lighthouseCases: readonly LighthouseCase[] = [
    {
        name: 'products/catalogue',
        route: '/en/products',
        seo: true
    },
    {
        name: 'products/detail',
        route: '/en/products/{subject:product.rich}',
        seo: true
    }
];
