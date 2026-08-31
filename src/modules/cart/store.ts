/**
 * @module
 * Pinia store for the cart module. Every mutating action replaces the local cart
 * wholesale with the payload the API returned, rather than patching it locally — the
 * getters below are all derived from that one `cart` ref.
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    getCart,
    getCartSummary,
    upsertCartItem,
    updateCartItemById,
    removeCartItem,
    clearCart,
    checkout as apiCheckout,
    reorder as apiReorder,
    getProductById
} from '@api';
import type { CartItem, CartResponse, CartSummaryResponse, CheckoutRequest } from '@types';
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { analyticsEvents } from '@/infrastructure/observability/analytics-events.ts';
import { absentIs, isTransportFailure } from '@/infrastructure/utils/errors';

/**
 * Owns the authenticated user's shopping cart: every action replaces the local
 * cart with the authoritative payload returned by the API.
 *
 * Checkout lives here and not in the orders store, even though it answers with an order: it is
 * `POST /cart/checkout`, the contract files it under `Cart`, and it is the one call that empties
 * the cart this store is responsible for. Owned from anywhere else, the local cart survives a
 * completed order and the header keeps showing items the server has already turned into one.
 */
export const useCartStore = defineStore('cart', () => {
    /**
     * Shared per-key loading-flag bookkeeping from the core store, threaded into
     * {@link useStructureRestApi} below.
     */
    const { getLoading, setLoading } = useCoreStore();

    /**
     * Generic REST helper: wraps every mutating call in `fetchAny` so `loading` toggles
     * automatically around each request.
     */
    const { loading, fetchAny } = useStructureRestApi<CartItem, string>({ getLoading, setLoading });

    /**
     * Full cart response (items + summary)
     */
    const cart = ref<CartResponse | undefined>();

    /**
     * Cart items list
     */
    const cartItems = computed(() => cart.value?.items ?? []);

    /**
     * Cart summary
     */
    const cartSummary = computed<CartSummaryResponse | undefined>(() => cart.value?.summary);

    /**
     * The summary alone, as `GET /cart/summary` answers it — the lightweight read that exists so
     * a header badge does not cost the whole cart on every page. Only a SEED: every cart mutation
     * replaces `cart` wholesale, and the full response's summary is fresher from that moment on.
     */
    const summarySeed = ref<CartSummaryResponse | undefined>();

    /**
     * What the header badge wears: the loaded cart's count when one is loaded, the seed before.
     */
    const badgeQuantity = computed(() =>
        cart.value ? cart.value.summary.itemsCount : summarySeed.value?.itemsCount
    );

    /**
     * Fetches the lightweight summary. Resolves with nothing for a guest — a 401 here means "no
     * cart", which is an ordinary state for a header, not an error worth a toast.
     *
     * @returns A promise resolving with the summary, or nothing.
     */
    const fetchSummary = () =>
        getCartSummary()
            .then((response) => {
                summarySeed.value = response.data;
                return response.data;
            })
            .catch((error: unknown) => {
                // 401 only — a guest has no cart. Anything else is a real failure, and swallowing
                // it would empty the header badge for someone whose cart is full.
                if (!absentIs(error, 401)) throw error;
                summarySeed.value = undefined;
                return undefined;
            });

    /**
     * Fetches the full cart (items + summary) and stores it.
     *
     * @returns A promise resolving with the cart response.
     */
    const fetchCart = () =>
        fetchAny(() =>
            getCart().then((response) => {
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Adds a product to the cart, or updates its quantity when already present.
     *
     * @param productId - Product to upsert.
     * @param quantity - Quantity to set for that product.
     * @returns A promise resolving with the updated cart response.
     */
    const upsertCartItemAction = (productId: string, quantity: number) =>
        fetchAny(() =>
            upsertCartItem({ productId, quantity }).then((response) => {
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Sets the exact quantity of an item already in the cart.
     *
     * @param productId - Product whose line is updated.
     * @param quantity - New quantity.
     * @returns A promise resolving with the updated cart response.
     */
    const updateCartItem = (productId: string, quantity: number) =>
        fetchAny(() =>
            updateCartItemById(productId, { quantity }).then((response) => {
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Removes a product's line from the cart entirely.
     *
     * @param productId - Product to remove.
     * @returns A promise resolving with the updated cart response.
     */
    const removeCartItemAction = (productId: string) =>
        fetchAny(() =>
            removeCartItem(productId).then((response) => {
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Empties the cart entirely, or removes a single item when a product is
     * supplied.
     *
     * Delegates to `DELETE /cart` with a `{ productId }` body for single-item
     * removal, and without a body to clear everything.
     *
     * @param productId - When provided, only this product's line is removed.
     * @returns A promise resolving with the updated cart response.
     */
    const clearCartAction = (productId?: string) =>
        fetchAny(() =>
            clearCart(productId ? { productId } : undefined).then((response) => {
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Turns the authenticated user's cart into an order.
     *
     * Reports only the failures the API never saw. Both outcomes it DID see — the order it created
     * and the checkout it refused — are emitted by the backend from the handler that decided them,
     * so it knows the reason and cannot be blocked by an extension or lost with the tab. A request
     * that never arrived is the one fact left for this side to report.
     *
     * @param checkoutData - Optional checkout payload (email, order notes).
     * @returns A promise resolving with the checkout response, the created order included.
     */
    const checkout = (checkoutData?: CheckoutRequest) =>
        fetchAny(() =>
            apiCheckout(checkoutData).then(
                (response) => {
                    /* The server empties the cart on success. The local copy is dropped rather
                     * than guessed at: this store never invents a payload the API did not send,
                     * and every getter already reads an unfetched cart as empty. */
                    cart.value = undefined;
                    return response.data;
                },
                (error: unknown) => {
                    if (isTransportFailure(error)) {
                        const obs = useObservabilityStore();
                        obs.track(analyticsEvents.CHECKOUT_REQUEST_FAILED);
                    }
                    throw error;
                }
            )
        );

    /**
     * Copies one of the caller's own orders back into the cart. The response is the updated
     * cart — products that left the catalogue were skipped server-side, so replacing the local
     * copy with it is also what makes the skip visible.
     *
     * @param orderId - One of the caller's own orders.
     * @returns A promise resolving with the updated cart response.
     */
    const reorder = (orderId: string) =>
        fetchAny(() =>
            apiReorder(orderId).then((response) => {
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Product titles keyed by id, for the lines the API answers as ids only — this store's and the
     * wishlist's, whose `CartItem` / `WishlistItem` carry a `productId` and nothing else. A line
     * headed by its id alone reads as a UUID to a screen reader.
     *
     * Lives here rather than in products because `products → cart` is a declared edge, and the
     * reverse would close a loop. The read goes through the contract directly — `@api` is
     * infrastructure, not a sibling — and a title that cannot be fetched simply stays absent: the
     * id is still rendered, so nothing is lost, only prettiness.
     */
    const productTitles = ref<Record<string, string>>({});

    /**
     * The title of one product, or its id while unknown.
     *
     * @param productId - The product.
     * @returns Something a human can call the line by.
     */
    const titleOf = (productId: string) => productTitles.value[productId] ?? productId;

    /**
     * Resolves the titles not yet known, one request each, failures ignored.
     *
     * @param productIds - The lines' products.
     * @returns A promise settling when every lookup has answered one way or the other.
     */
    const resolveTitles = (productIds: string[]) =>
        Promise.allSettled(
            [...new Set(productIds)]
                .filter((productId) => !(productId in productTitles.value))
                .map((productId) =>
                    getProductById(productId).then(({ data }) => {
                        productTitles.value = { ...productTitles.value, [productId]: data.title };
                    })
                )
        ).then(() => productTitles.value);

    return {
        cart,
        cartItems,
        cartSummary,
        badgeQuantity,
        fetchSummary,

        loading,
        fetchCart,
        productTitles,
        titleOf,
        resolveTitles,
        checkout,
        reorder,
        upsertCartItem: upsertCartItemAction,
        updateCartItem,
        removeCartItem: removeCartItemAction,
        clearCart: clearCartAction
    };
});
