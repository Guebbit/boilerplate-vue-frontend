/**
 * @module
 * The shop's one currency, read once from `GET /products/settings` and held in a module-level ref.
 *
 * A shop setting, not a product field (Shopify's `shop.currency`): it is what a price input is
 * sized from before any resource exists to carry its own `currency`, and what stands in for a
 * resource that lacks one. Empty until loaded — a caller that needs it to render waits on
 * {@link loadShopCurrency}; one that only labels a figure reads {@link shopCurrency}.
 */
import { readonly, ref } from 'vue';
import { getProductSettings } from '@api';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * The loaded ISO 4217 code, or `''` while unknown. Empty rather than a guessed default: a silent
 * `EUR` is a wrong price for every shop that trades in something else.
 */
const currency = ref('');

/**
 * The in-flight or settled load, so concurrent and repeated callers share one request.
 */
let loading: Promise<string> | undefined;

/**
 * Read-only view of the shop's currency; `''` until {@link loadShopCurrency} has resolved.
 */
export const shopCurrency = readonly(currency);

/**
 * Loads the shop's currency once. A failure is logged and leaves it empty, and the next call
 * tries again — the endpoint is public, so a failure here is the network's, not a refusal.
 *
 * @returns A promise resolving with the currency code, or `''` when it could not be read. Never
 *  rejects.
 */
export const loadShopCurrency = (): Promise<string> => {
    loading ??= getProductSettings()
        .then((response) => {
            currency.value = response.data.currency;
            return currency.value;
        })
        .catch((error: unknown) => {
            logger.error('[ShopCurrency] Could not read the shop currency:', error);
            loading = undefined;
            return '';
        });
    return loading;
};

/**
 * Forgets the loaded value so the next {@link loadShopCurrency} asks again — for tests, which
 * share this module's state across cases.
 */
export const resetShopCurrency = (): void => {
    currency.value = '';
    loading = undefined;
};
