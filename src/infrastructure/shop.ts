/**
 * @module
 * The shop itself, read once from `GET /shop` and held in module-level refs: the currency, the
 * countries it ships to, the seller's identity, and where returns go.
 *
 * A shop setting, not a product field (Shopify's `Shop`): the currency is what a price input is
 * sized from before any resource exists to carry its own `currency`, and what stands in for a
 * resource that lacks one. Empty until loaded — a caller that needs it to render waits on
 * {@link loadShop}; one that only labels a figure reads {@link shopCurrency}.
 */
import { computed, readonly, ref } from 'vue';
import { getShop } from '@api';
import type { Shop } from '@api';
import { logger } from '@/infrastructure/utils/logger.ts';

/** The loaded record, or `undefined` while unknown. */
const shop = ref<Shop>();

/**
 * The in-flight or settled load, so concurrent and repeated callers share one request.
 */
let loading: Promise<Shop | undefined> | undefined;

/**
 * Read-only view of the whole record; `undefined` until {@link loadShop} has resolved. The Terms
 * page reads the seller's identity from it.
 */
export const shopRecord = readonly(shop);

/**
 * The shop's ISO 4217 code, or `''` while unknown. Empty rather than a guessed default: a silent
 * `EUR` is a wrong price for every shop that trades in something else.
 */
export const shopCurrency = computed(() => shop.value?.currency ?? '');

/**
 * The countries the shop ships a physical order to; empty while unknown, which the address form
 * reads as "unrestricted".
 */
export const shipToCountries = computed(() => shop.value?.shipToCountries ?? []);

/**
 * Loads the shop once. A failure is logged and leaves it empty, and the next call tries again —
 * the endpoint is public, so a failure here is the network's, not a refusal.
 *
 * @returns A promise resolving with the record, or `undefined` when it could not be read. Never
 *  rejects.
 */
export const loadShop = (): Promise<Shop | undefined> => {
    loading ??= getShop()
        .then((response) => {
            shop.value = response.data;
            return shop.value;
        })
        .catch((error: unknown) => {
            logger.error('[Shop] Could not read the shop:', error);
            loading = undefined;
            return undefined;
        });
    return loading;
};

/**
 * Forgets the loaded value so the next {@link loadShop} asks again — for tests, which share this
 * module's state across cases.
 */
export const resetShop = (): void => {
    shop.value = undefined;
    loading = undefined;
};
