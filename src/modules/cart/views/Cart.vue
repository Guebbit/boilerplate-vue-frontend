<script lang="ts">
export default {
    name: 'CartPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Cart page. Renders the store's lines and summary, and layers a debounced local
 * stepper (`useLineQuantity`) on top of the store's own quantity update so rapid
 * clicks collapse into one request per line.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Minus, Plus, ShoppingCart } from 'lucide-vue-next';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useCartStore } from '@/modules/cart/store.ts';
// The stepper's floor is a rule, not a template detail — see `../domain/quantity.ts`. The
// clamping half of that rule moved with the stepping itself, into `use-line-quantity.ts`.
import { MIN_LINE_QUANTITY, classifyCheckoutError } from '@/modules/cart/domain';
import type { CheckoutShortfallLine, UnavailableCartLine } from '@/modules/cart/domain';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useLineQuantity } from '@/modules/cart/composables/use-line-quantity.ts';
import type { CartItem, PaymentMethodId } from '@types';

import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { ShippingSelector } from '@/modules/delivery';
import { PaymentMethodSelector } from '@/modules/payments';
import { AddressPicker } from '@/modules/account';
import { useProductLines } from '@/modules/products';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Router, for the post-checkout navigation to the new order's own page.
 */
const router = useRouter();

/**
 * Toast notifications.
 */
const { addMessage } = useNotificationsStore();

/**
 * Cart store actions this page drives directly.
 */
const {
    fetchCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    setShippingMethod,
    checkout: placeOrder
} = useCartStore();

/**
 * The lines' product join: one batched read, then title and price off the products dictionary —
 * the record the product page shows, not a copy this store keeps.
 */
const { loadProducts, productOf, titleOf } = useProductLines();

/**
 * Cart store state, reactive. `loading` is the in-flight guard for checkout and clear (FA39): both
 * write endpoints, so a double-click before the first request answers must not fire a second one.
 */
const { cart, cartItems, cartSummary, cartShipping, loading } = storeToRefs(useCartStore());

/**
 * The chosen shipping method — mirrors `cart.value?.shipping.selected` (see the `watch` below that
 * loads it once the cart resolves), and drives `PUT /cart/shipping-method` on every change the
 * shopper makes through {@link ShippingSelector}.
 */
const shippingMethodId = ref<string | undefined>();

/**
 * Loads {@link shippingMethodId} from whatever the cart says once it resolves — a returning
 * shopper's earlier choice should pre-select the radio, not start every visit unchosen. `once`:
 * only the cart's FIRST resolution seeds the picker; every change after that is the shopper's own,
 * driven the other way by the `watch` below.
 */
watch(
    cart,
    (loaded) => {
        if (loaded) shippingMethodId.value = loaded.shipping.selected ?? undefined;
    },
    { once: true }
);

/**
 * Persists a shopper's shipping-method choice the moment they make it — priced and validated
 * against the real basket server-side, rather than only checked once at checkout. A refusal
 * (the basket no longer needs shipping, or has outgrown the method's weight range) reverts the
 * picker to its previous choice rather than leaving a selection the server rejected.
 */
watch(shippingMethodId, (chosen, previous) => {
    if (chosen === (cart.value?.shipping.selected ?? undefined)) return;
    void setShippingMethod(chosen ?? null).catch((error: unknown) => {
        const verdict = classifyCheckoutError(error);
        addMessage(
            t(
                verdict.kind === 'shipping-method-weight'
                    ? 'cart-page.error-shipping-method-weight'
                    : 'cart-page.error-shipping-method-generic'
            )
        );
        shippingMethodId.value = previous;
    });
});

/**
 * Whether the chosen method needs an address — `undefined` while nothing is selected, mirrored
 * out of `ShippingSelector` since `cart` may not reach `delivery`'s store directly.
 */
const shippingMethodRequiresAddress = ref<boolean>();

/**
 * The deployment's ship-to list (E12), mirrored out of `ShippingSelector` the same way — narrows
 * `AddressPicker`'s add-address dialog so checkout never offers a country the shop cannot deliver
 * to.
 */
const shipToCountries = ref<string[]>([]);

/**
 * The chosen shipping address's entry id — required only when
 * {@link shippingMethodRequiresAddress} is true; omitted, checkout resolves the caller's default.
 */
const addressId = ref<string | undefined>();

/**
 * The chosen payment method — optional; the API defaults an omitted choice to `card`.
 */
const paymentMethodId = ref<PaymentMethodId | undefined>();

/**
 * Free-text notes left at checkout — optional, trimmed to `undefined` when blank so an empty
 * textarea does not send an empty string the contract would rather see omitted.
 */
const notes = ref('');

/**
 * Whether checkout may run yet: a physical basket needs a method, and — only when that method
 * demands it — an address. Reads the cart's own `shipping.required` flag (FA-D6/B3) rather than
 * re-deriving it from the lines: the server already decided.
 */
const canCheckout = computed(() => {
    if (!cartShipping.value?.required) return true;
    if (shippingMethodId.value === undefined) return false;
    return !shippingMethodRequiresAddress.value || addressId.value !== undefined;
});

/**
 * The short lines a `CART_INSUFFICIENT_STOCK` refusal named, rendered inline so the customer
 * fixes the basket in one pass rather than being refused again on the next attempt. Empty
 * whenever the last checkout did not end in this particular refusal.
 */
const insufficientStockLines = ref<CheckoutShortfallLine[]>([]);

/**
 * The lines a `CART_PRODUCT_UNAVAILABLE` refusal named — a product removed or deactivated since
 * the basket was built. Empty whenever the last checkout did not end in this refusal.
 */
const unavailableLines = ref<UnavailableCartLine[]>([]);

/**
 * The checkout button's own blocked state — the one dedicated control this page cannot proceed
 * past until it succeeds. Every refusal `classifyCheckoutError` names more specifically keeps its
 * own toast/inline handling above; only the generic fallback renders here.
 */
const {
    message: checkoutError,
    report: reportCheckoutError,
    clear: clearCheckoutError
} = useBlockingError();

/**
 * The checkout request itself, once {@link checkout} has confirmed no line-quantity step is still
 * in the debounce window.
 *
 * See `docs/modules/cart-checkout.md` §"The seven refusals, and why they are shaped differently"
 * for what each `classifyCheckoutError` branch below answers and why. A transport failure alone
 * has no more specific answer than the generic toast.
 *
 * @returns A promise resolving once the flow settles: a success toast and a navigation to the new
 *  order's own page, or the refusal-specific handling below.
 */
const runCheckout = () =>
    placeOrder({
        // No `shippingMethodId` here — it is the cart's own choice now, already persisted via
        // `PUT /cart/shipping-method` by the `watch` above.
        // Only when the chosen method actually needs one: the picker unmounts on pickup but
        // leaves `addressId` holding its last value, and the backend now refuses an address
        // paired with a method that can't use it (409 `CART_ADDRESS_NOT_APPLICABLE`).
        ...(shippingMethodRequiresAddress.value && addressId.value !== undefined
            ? { addressId: addressId.value }
            : {}),
        ...(paymentMethodId.value === undefined ? {} : { paymentMethod: paymentMethodId.value }),
        ...(notes.value.trim() === '' ? {} : { notes: notes.value.trim() })
    })
        .then((result) => {
            // `fetchAny`'s type allows `undefined` on a swallowed failure — this call never
            // actually takes that path (see `useCartStore.checkout`'s own docblock), but the
            // guard is what lets `result.id` below type-check, and it is cheap insurance
            // against a client-side navigation to `/orders/undefined` either way.
            if (!result?.id) return;
            addMessage(t('cart-page.success-checkout'));
            // `orders` is not one of cart's declared MODULE_EDGES reaches (FA86) — a build
            // shipping no orders module still completes the checkout, just with nowhere to SHOW
            // the order it just placed, so it lands Home instead of throwing.
            const target = linkIfRouted(router, 'OrderTarget', { id: result.id }) ?? {
                name: 'Home'
            };
            // Fire-and-forget: a NavigationFailure here must not convert a completed checkout into an error toast.
            void router.push(routerLinkI18n(target));
        })
        .catch((error: unknown) => {
            const verdict = classifyCheckoutError(error);
            if (verdict.kind === 'cart-changed') {
                addMessage(t('cart-page.error-cart-changed'));
                return fetchCart().then(() => undefined);
            }
            if (verdict.kind === 'insufficient-stock') {
                insufficientStockLines.value = verdict.lines;
                addMessage(t('cart-page.error-insufficient-stock'));
                return;
            }
            if (verdict.kind === 'address-not-found') {
                addMessage(t('cart-page.error-address-not-found'));
                return;
            }
            if (verdict.kind === 'shipping-method-weight') {
                // Reopens the picker rather than leaving the refused choice selected — the basket
                // this client weighed is advisory, so the server's own enforced check is the one
                // that actually knows the chosen method cannot carry it.
                shippingMethodId.value = undefined;
                addMessage(t('cart-page.error-shipping-method-weight'));
                return;
            }
            if (verdict.kind === 'ship-to-country-not-supported') {
                // E12: the resolved address's country fell outside the ship-to list — the select
                // above already narrows a NEW address to it, so the fix is picking (or adding)
                // one, not a field this page can correct on the shopper's behalf.
                addMessage(t('cart-page.error-ship-to-country-not-supported'));
                return;
            }
            if (verdict.kind === 'product-unavailable') {
                unavailableLines.value = verdict.lines;
                addMessage(t('cart-page.error-product-unavailable'));
                return;
            }
            reportCheckoutError(error);
        });

/**
 * Places an order from the current cart.
 *
 * Awaits {@link settle} first (FA34): a line-quantity step still in the debounce window when
 * checkout reads the cart could otherwise land after the server already emptied it, either
 * re-creating a line in an already-completed order's aftermath or racing the read itself.
 *
 * `settle` rejects when a flushed step failed to reach the server — `useLineQuantity`'s own
 * `onError` has already reported that failure, so this only needs to skip {@link runCheckout}
 * rather than place the order at whatever stale quantity the cart still holds.
 *
 * @returns Same as {@link runCheckout}, or nothing when settling failed.
 */
const checkout = () => {
    insufficientStockLines.value = [];
    unavailableLines.value = [];
    clearCheckoutError();
    return settle()
        .then(runCheckout)
        .catch(() => undefined);
};

/**
 * The cart lines' own blocked state — stepping a quantity or removing a line has no per-line slot
 * for an alert, and the list keeps working regardless, so every line action shares ONE instance
 * rendered above the lines, the same reasoning `ProductsList.vue`'s row actions use.
 */
const {
    message: lineActionError,
    report: reportLineActionError,
    clear: clearLineActionError
} = useBlockingError();

/**
 * Stepping a line's quantity, debounced per product so three quick clicks are one request for the
 * number the visitor stopped on — rather than three racing requests whose last answer wins. The
 * reason that mattered, and why the delay is invisible, is in the composable.
 */
const { quantityOf, stepQuantity, forget, forgetAll, flushPending, settle } = useLineQuantity(
    updateCartItem,
    (error: unknown) => reportLineActionError(error)
);

/**
 * @param item - The cart line.
 * @returns The quantity the line should show — the visitor's own pending step while one is
 *  outstanding, the store's number the rest of the time.
 */
const lineQuantity = (item: CartItem) => quantityOf(item.productId, item.quantity);

/**
 * Removes a line, forgetting any step still queued for it first: a pending quantity for a line
 * that no longer exists would fire after the removal and put the line back.
 *
 * @param productId - The line to remove.
 * @returns A promise resolving once the removal settles; a failure blocks the line actions in
 *  place ({@link lineActionError}).
 */
const removeLine = (productId: string) => {
    forget(productId);
    clearLineActionError();
    return removeCartItem(productId).catch((error: unknown) => reportLineActionError(error));
};

/**
 * Empties the whole cart, forgetting every line's pending step first (FA34): a queued step for a
 * line this is about to wipe would otherwise fire afterward and put that line back.
 *
 * @returns A promise resolving once the clear settles; a failure blocks the line actions in place
 *  ({@link lineActionError}).
 */
const handleClearCart = () => {
    forgetAll();
    clearLineActionError();
    return clearCart().catch((error: unknown) => reportLineActionError(error));
};

onBeforeUnmount(flushPending);

/**
 * Load cart on mount
 */
onMounted(() =>
    fetchCart().then((cart) => loadProducts((cart?.items ?? []).map(({ productId }) => productId)))
);
</script>

<template>
    <div id="cart-page">
        <v-empty-state v-if="cartItems.length === 0" :title="t('cart-page.empty-cart')">
            <template #media>
                <ShoppingCart :size="64" class="text-secondary" aria-hidden="true" />
            </template>
            <template #actions>
                <v-btn color="primary" :to="routerLinkI18n({ name: 'ProductsList' })">
                    {{ t('cart-page.button-go-to-products') }}
                </v-btn>
            </template>
        </v-empty-state>

        <div v-else class="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <!--
                CART_INSUFFICIENT_STOCK names every short line in one response — rendering it as a
                single "some items are unavailable" toast would turn a one-pass fix into a
                guessing game. See `docs/modules/cart-checkout.md`.
            -->
            <v-alert
                v-if="insufficientStockLines.length > 0"
                type="warning"
                variant="tonal"
                data-test="checkout-shortfall"
                class="lg:col-span-2"
            >
                <ul class="flex flex-col gap-1">
                    <li
                        v-for="line in insufficientStockLines"
                        :key="line.productId"
                        data-test="checkout-shortfall-line"
                    >
                        {{
                            t('cart-page.shortfall-line', {
                                title: line.title,
                                requested: line.requested,
                                available: line.available
                            })
                        }}
                    </li>
                </ul>
            </v-alert>

            <!--
                CART_PRODUCT_UNAVAILABLE names every line whose product left the catalogue since
                the basket was built — the same one-pass-fix reasoning as the shortfall alert
                above, not a generic "some items are unavailable" toast.
            -->
            <v-alert
                v-if="unavailableLines.length > 0"
                type="warning"
                variant="tonal"
                data-test="checkout-unavailable"
                class="lg:col-span-2"
            >
                <ul class="flex flex-col gap-1">
                    <li
                        v-for="line in unavailableLines"
                        :key="line.productId"
                        data-test="checkout-unavailable-line"
                    >
                        {{ line.title ?? line.productId }}
                    </li>
                </ul>
            </v-alert>

            <InlineErrorAlert
                :message="lineActionError"
                class="lg:col-span-2"
                data-test="cart-line-action-error"
            />

            <div class="flex flex-col gap-4">
                <v-card
                    v-for="item in cartItems"
                    :key="'cart-item-' + item.productId"
                    data-test="cart-item"
                    class="p-5"
                >
                    <h2 class="text-lg font-semibold">
                        <b>{{ titleOf(item.productId) }}</b>
                    </h2>
                    <!-- A status: the steppers below change it, and a reader should hear the new number. -->
                    <p class="mt-1 opacity-80" role="status">
                        {{ t('cart-page.label-quantity') }}: {{ lineQuantity(item) }}
                    </p>
                    <!-- FA32b: absent until the product read has answered for this line — no price
                         guessed ahead of the server's own answer. -->
                    <p
                        v-if="productOf(item.productId)"
                        class="mt-1 opacity-80"
                        data-test="cart-line-price"
                    >
                        {{
                            formatCurrency(
                                productOf(item.productId)?.price,
                                productOf(item.productId)?.currency ?? ''
                            )
                        }}
                        ×
                        {{ lineQuantity(item) }}
                        =
                        {{
                            formatCurrency(
                                (productOf(item.productId)?.price ?? 0) * lineQuantity(item),
                                productOf(item.productId)?.currency ?? ''
                            )
                        }}
                    </p>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                        <v-btn
                            icon
                            size="small"
                            variant="tonal"
                            data-test="cart-decrease"
                            :disabled="lineQuantity(item) <= MIN_LINE_QUANTITY"
                            :aria-label="
                                t('cart-page.button-decrease-named', {
                                    id: titleOf(item.productId)
                                })
                            "
                            @click="stepQuantity(item.productId, item.quantity, -1)"
                        >
                            <Minus :size="16" aria-hidden="true" />
                        </v-btn>
                        <v-btn
                            icon
                            size="small"
                            variant="tonal"
                            data-test="cart-increase"
                            :aria-label="
                                t('cart-page.button-increase-named', {
                                    id: titleOf(item.productId)
                                })
                            "
                            @click="stepQuantity(item.productId, item.quantity, 1)"
                        >
                            <Plus :size="16" aria-hidden="true" />
                        </v-btn>
                        <v-btn
                            variant="text"
                            color="error"
                            data-test="cart-remove"
                            :disabled="loading"
                            :aria-label="
                                t('cart-page.button-remove-named', { id: titleOf(item.productId) })
                            "
                            @click="removeLine(item.productId)"
                        >
                            {{ t('cart-page.button-remove') }}
                        </v-btn>
                    </div>
                </v-card>
            </div>

            <div class="flex flex-col gap-4">
                <v-card v-if="cartSummary" data-test="cart-summary" class="p-5 lg:sticky lg:top-20">
                    <h2 class="text-lg font-semibold">{{ t('cart-page.label-summary') }}</h2>
                    <dl class="mt-3 grid grid-cols-[1fr_auto] gap-y-1">
                        <dt class="opacity-70">{{ t('cart-page.label-items-count') }}</dt>
                        <dd class="text-right font-medium">{{ cartSummary.itemsCount }}</dd>
                        <dt class="opacity-70">{{ t('cart-page.label-total-quantity') }}</dt>
                        <dd class="text-right font-medium">{{ cartSummary.totalQuantity }}</dd>
                    </dl>
                    <v-divider class="my-3" />
                    <ShippingSelector
                        v-model="shippingMethodId"
                        v-model:requires-address="shippingMethodRequiresAddress"
                        v-model:ship-to-countries="shipToCountries"
                        :options="cartShipping?.options ?? []"
                        :currency="cartSummary.currency"
                    />
                    <!--
                        Only asked when the chosen method actually needs one — a digital-only
                        basket, or `pickup`, never renders this at all.
                    -->
                    <AddressPicker
                        v-if="shippingMethodRequiresAddress"
                        v-model="addressId"
                        :ship-to-countries="shipToCountries"
                        class="mt-3"
                    />
                    <PaymentMethodSelector v-model="paymentMethodId" />
                    <v-textarea
                        v-model="notes"
                        :label="t('cart-page.label-notes')"
                        rows="2"
                        auto-grow
                        class="mt-3"
                        data-test="cart-notes"
                    />
                    <v-divider class="my-3" />
                    <dl class="grid grid-cols-[1fr_auto] gap-y-1">
                        <dt class="opacity-70">{{ t('cart-page.label-items-total') }}</dt>
                        <dd class="text-right font-medium" data-test="cart-items-total">
                            {{ formatCurrency(cartSummary.itemsTotal, cartSummary.currency) }}
                        </dd>
                        <dt v-if="shippingMethodId" class="opacity-70">
                            {{ t('cart-page.label-shipping-cost') }}
                        </dt>
                        <dd
                            v-if="shippingMethodId"
                            class="text-right font-medium"
                            data-test="cart-shipping-cost"
                        >
                            {{ formatCurrency(cartSummary.shippingCost, cartSummary.currency) }}
                        </dd>
                    </dl>
                    <v-divider class="my-3" />
                    <div class="flex items-baseline justify-between">
                        <span class="opacity-70">{{ t('cart-page.label-total') }}</span>
                        <span class="text-xl font-bold" role="status" data-test="cart-total">
                            {{ formatCurrency(cartSummary.totalPrice, cartSummary.currency) }}
                        </span>
                    </div>
                    <v-btn
                        color="primary"
                        size="large"
                        block
                        class="mt-4"
                        data-test="cart-checkout"
                        :disabled="!canCheckout || loading"
                        @click="checkout"
                    >
                        {{ t('cart-page.button-checkout') }}
                    </v-btn>
                    <InlineErrorAlert
                        :message="checkoutError"
                        class="mt-2"
                        data-test="cart-checkout-error"
                    />
                    <v-btn
                        variant="text"
                        block
                        class="mt-2"
                        data-test="cart-clear"
                        :disabled="loading"
                        @click="handleClearCart"
                    >
                        {{ t('cart-page.button-clear') }}
                    </v-btn>
                </v-card>
            </div>
        </div>
    </div>
</template>
