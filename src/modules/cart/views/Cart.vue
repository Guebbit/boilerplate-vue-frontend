<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
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
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Minus, Plus, ShoppingCart } from 'lucide-vue-next';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useCartStore } from '../store.ts';
// The stepper's floor is a rule, not a template detail — see `../domain/quantity.ts`. The
// clamping half of that rule moved with the stepping itself, into `use-line-quantity.ts`.
import { MIN_LINE_QUANTITY, classifyCheckoutError, fromMinorUnits } from '../domain';
import type { CheckoutShortfallLine, ExpectedTotal, UnavailableCartLine } from '../domain';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { currencyDigits, formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useLineQuantity } from '../composables/use-line-quantity.ts';
import { useCartStockPoll } from '../composables/use-cart-stock-poll.ts';
import { useCartFocusRefresh } from '../composables/use-cart-focus-refresh.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import {
    clearCheckoutDrafts,
    readCheckoutDraft,
    writeCheckoutDraft
} from '../composables/use-checkout-draft.ts';
import { sendKeepalive } from '@/infrastructure/http/keepalive.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import type { CartResponseItem, PaymentMethodId } from '@types';

import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import TourButton from '@/ui/molecules/TourButton.vue';
import MergeReportAlert from '../components/MergeReportAlert.vue';
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
const { loadProducts, productOf, titleOf, availabilityLabel } = useProductLines();

/**
 * Cart store state, reactive. `loading` is the in-flight guard for checkout and clear: both
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
 * Keeps {@link shippingMethodId} on what the cart says: a returning shopper's earlier choice
 * pre-selects the radio, and a later answer that changes the choice (the server cleared a method
 * the basket outgrew, or a slow read landed) moves it too. The shopper's own pick needs no special
 * case: it reaches the cart through the `watch` below, and the cart then says the same thing.
 */
watch(
    () => cart.value?.shipping.selected,
    (selected) => {
        shippingMethodId.value = selected ?? undefined;
    },
    { immediate: true }
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
 * The deployment's ship-to list, mirrored out of `ShippingSelector` the same way — narrows
 * `AddressPicker`'s add-address dialog so checkout never offers a country the shop cannot deliver
 * to.
 */
const shipToCountries = ref<string[]>([]);

/**
 * The signed-in visitor, whose id keys the saved checkout draft.
 */
const { viewer } = storeToRefs(useSessionStore());

/**
 * What this visitor had typed or picked before the page last went away — empty on a first visit.
 */
const savedDraft = viewer.value ? readCheckoutDraft(viewer.value.id) : readCheckoutDraft('');

/**
 * The chosen shipping address's entry id — required only when
 * {@link shippingMethodRequiresAddress} is true; omitted, checkout resolves the caller's default.
 */
const addressId = ref<string | undefined>(savedDraft.addressId);

/**
 * The chosen billing address's entry id. `undefined` means "same as the shipping address" while
 * {@link shipsToAddress} holds; otherwise the picker always holds an entry (the book's
 * default until the visitor picks), so checkout never asks the API to guess.
 */
const billingAddressId = ref<string | undefined>();

/**
 * Whether the shipping address is asked at all — a physical basket under a method that needs one.
 * It is the one condition under which billing can be "the same as" it; otherwise (a digital-only
 * basket, or a pickup) billing is asked on its own.
 */
const shipsToAddress = computed(
    () => cartShipping.value?.required === true && shippingMethodRequiresAddress.value === true
);

/**
 * The chosen payment method — optional; the API defaults an omitted choice to `card`.
 */
const paymentMethodId = ref<PaymentMethodId | undefined>(savedDraft.paymentMethodId);

/**
 * Free-text notes left at checkout — optional, trimmed to `undefined` when blank so an empty
 * textarea does not send an empty string the contract would rather see omitted.
 */
const notes = ref(savedDraft.notes);

/**
 * Keeps the note, the payment choice and the address in the tab's own storage as they change, so a
 * reload puts them back. Dropped by checkout and by logout (`module.ts`).
 */
watch([notes, paymentMethodId, addressId], () => {
    if (viewer.value)
        writeCheckoutDraft(viewer.value.id, {
            notes: notes.value,
            ...(paymentMethodId.value === undefined
                ? {}
                : { paymentMethodId: paymentMethodId.value }),
            ...(addressId.value === undefined ? {} : { addressId: addressId.value })
        });
});

/**
 * Whether any line cannot be bought as it stands (short, sold out, off sale, removed). Checkout
 * refuses every one of those, so "Place order" waits until the shopper has fixed them. A
 * `preorder` line is buyable: it ships from its release date.
 */
const linesNeedAttention = computed(() =>
    cartItems.value.some(
        ({ availability }) => availability !== 'in_stock' && availability !== 'preorder'
    )
);

/**
 * Whether checkout may run yet: every line buyable, a physical basket with a method, and — only
 * when that method demands it — an address. Reads the cart's own `shipping.required` flag rather
 * than re-deriving it from the lines: the server already decided.
 */
const canCheckout = computed(() => {
    if (linesNeedAttention.value) return false;
    // Billing is asked on its own when nothing ships to an address: an entry must be chosen
    // (the picker pre-selects the default, so this only holds back an empty book).
    if (!shipsToAddress.value && billingAddressId.value === undefined) return false;
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
 * The lines a `CART_PRODUCT_UNAVAILABLE` refusal named — a product removed or hidden since
 * the basket was built. Empty whenever the last checkout did not end in this refusal.
 */
const unavailableLines = ref<UnavailableCartLine[]>([]);

/**
 * The sentence for one refused line: fewer left, none left, or off sale. Literal keys, so a
 * translation check can see each of them.
 *
 * @param line - A line the stock refusal named.
 * @returns The line's message.
 */
const shortfallText = ({ title, requested, availability }: CheckoutShortfallLine): string => {
    if (availability === 'out_of_stock')
        return t('cart-page.shortfall-line-out-of-stock', { title });
    if (availability === 'unavailable') return t('cart-page.shortfall-line-unavailable', { title });
    return t('cart-page.shortfall-line', { title, requested });
};

/**
 * The unpaid orders `CART_OPEN_ORDER_LIMIT` named, as links the shopper can follow to pay or
 * cancel one. Empty whenever the last checkout did not end in this refusal.
 */
const openOrderIds = ref<string[]>([]);

/**
 * Where each of {@link openOrderIds} lives. An order page is the orders module's: a build without
 * it has nowhere to send the shopper, so those ids simply get no link.
 */
const openOrderTargets = computed(() =>
    openOrderIds.value.flatMap((id) => {
        const target = linkIfRouted(router, 'OrderTarget', { id });
        return target ? [{ id, to: routerLinkI18n(target) }] : [];
    })
);

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
 * Whether an order is being placed, from the first instant of the press. Set synchronously, which
 * `loading` is not (it flips inside the store, a task later), so a second press in the same task
 * and the steppers are both shut out for the whole call. See `docs/modules/cart-checkout.md`.
 */
const placing = ref(false);

/**
 * A wire money amount, written the way the rest of the page writes prices.
 *
 * @param money - Minor units plus currency, from `CART_TOTAL_CHANGED`'s details.
 * @returns The amount in the visitor's locale formatting.
 */
const formatMinor = (money: ExpectedTotal) =>
    formatCurrency(fromMinorUnits(money.amount, currencyDigits(money.currency)), money.currency);

/**
 * The refusal text for a total that moved between what the page showed and what would be charged.
 * Without both amounts (a malformed `details`) it falls back to the sentence that names neither.
 *
 * @param expected - The total the page showed.
 * @param actual - The total the server would charge.
 * @returns The message to show.
 */
const totalChangedMessage = (expected?: ExpectedTotal, actual?: ExpectedTotal) =>
    expected && actual
        ? t('cart-page.error-total-changed', {
              from: formatMinor(expected),
              to: formatMinor(actual)
          })
        : t('cart-page.error-total-changed-generic');

/**
 * The checkout request itself, once {@link checkout} has confirmed no line-quantity step is still
 * in the debounce window.
 *
 * See `docs/modules/cart-checkout.md` §"The eight refusals, and why they are shaped differently"
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
        ...(cartShipping.value?.required &&
        shippingMethodRequiresAddress.value &&
        addressId.value !== undefined
            ? { addressId: addressId.value }
            : {}),
        // The billing entry the visitor named; left out, the API reads it as "same as shipping".
        ...(billingAddressId.value === undefined
            ? {}
            : { billingAddressId: billingAddressId.value }),
        ...(paymentMethodId.value === undefined ? {} : { paymentMethod: paymentMethodId.value }),
        ...(notes.value.trim() === '' ? {} : { notes: notes.value.trim() })
    })
        .then((result) => {
            // `fetchAny`'s type allows `undefined` on a swallowed failure — this call never
            // actually takes that path (see `useCartStore.checkout`'s own docblock), but the
            // guard is what lets `result.id` below type-check, and it is cheap insurance
            // against a client-side navigation to `/orders/undefined` either way.
            if (!result?.id) return;
            // The order consumed these lines: a step still in its debounce window must not fire
            // afterwards, where its `PUT` would create the line again in the new, empty cart.
            forgetAll();
            clearCheckoutDrafts();
            addMessage(t('cart-page.success-checkout'));
            // `orders` is not one of cart's declared MODULE_EDGES reaches — a build
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
            if (verdict.kind === 'total-changed') {
                // The store already read the cart again, so the page shows the new total; the
                // button stays live, and the next press confirms that total.
                addMessage(totalChangedMessage(verdict.expected, verdict.actual));
                return;
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
            if (verdict.kind === 'billing-address-required') {
                addMessage(t('cart-page.error-billing-address-required'));
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
                // The resolved address's country fell outside the ship-to list — the select
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
            if (verdict.kind === 'open-order-limit') {
                openOrderIds.value = verdict.orderIds;
                addMessage(t('cart-page.error-open-order-limit'));
                return;
            }
            if (verdict.kind === 'cart-empty') {
                // The server holds no basket: the order a lost answer hid exists. The page must
                // stop offering lines that are not there.
                addMessage(t('cart-page.error-cart-empty'));
                return fetchCart().then(() => undefined);
            }
            if (verdict.kind === 'in-flight') {
                // The store already waited for the first attempt; it is still running.
                addMessage(t('cart-page.error-checkout-in-flight'));
                return fetchCart().then(() => undefined);
            }
            if (verdict.kind === 'server-error' && cartItems.value.length === 0) {
                // The store read the cart again after the 500: empty means the order was written.
                addMessage(t('cart-page.order-placed-after-error'));
                const orders = linkIfRouted(router, 'OrdersList') ?? { name: 'Home' };
                void router.push(routerLinkI18n(orders));
                return;
            }
            reportCheckoutError(error);
        });

/**
 * Places an order from the current cart.
 *
 * Awaits {@link settle} first: a line-quantity step still in the debounce window when
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
    if (placing.value) return Promise.resolve();
    placing.value = true;
    insufficientStockLines.value = [];
    unavailableLines.value = [];
    openOrderIds.value = [];
    clearCheckoutError();
    return settle()
        .then(runCheckout)
        .catch(() => undefined)
        .finally(() => {
            placing.value = false;
        });
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
const { quantityOf, stepQuantity, forget, forgetAll, flushPending, sendPendingKeepalive, settle } =
    useLineQuantity(updateCartItem, (error: unknown) => reportLineActionError(error));

/**
 * @param item - The cart line.
 * @returns The quantity the line should show — the visitor's own pending step while one is
 *  outstanding, the store's number the rest of the time.
 */
const lineQuantity = (item: CartResponseItem) => quantityOf(item.productId, item.quantity);

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
 * Empties the whole cart after an explicit confirmation — the same dialog cancelling an order
 * uses, since a clear is destructive and cannot be undone.
 *
 * Forgets every line's pending step once the shopper accepts: a queued step for a line this
 * is about to wipe would otherwise fire afterward and put that line back. A declined dialog
 * touches nothing, pending steps included.
 *
 * @returns A promise resolving once the shopper declines or the clear settles; a failure blocks
 *  the line actions in place ({@link lineActionError}).
 */
const handleClearCart = () => {
    // The line count is what the question names: a bulk action has no single row to point at.
    const count = cartItems.value.length;
    return useDialogStore()
        .confirm({ message: t('cart-page.confirm-clear', { count }, count), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            forgetAll();
            clearLineActionError();
            return clearCart().catch((error: unknown) => reportLineActionError(error));
        });
};

/**
 * A step still inside its debounce when the page goes away (a reload, a closed tab) is sent by a
 * request that outlives the page, rather than lost with its timer.
 */
const onPageHide = () =>
    sendPendingKeepalive((productId, quantity) => {
        sendKeepalive('PUT', `/cart/${productId}`, { quantity });
    });

onMounted(() => window.addEventListener('pagehide', onPageHide));

onBeforeUnmount(() => {
    window.removeEventListener('pagehide', onPageHide);
    flushPending();
});

/**
 * Keeps each line's `availability` fresh while this page is open, when the deployment
 * turned the poll on (`VITE_CART_STOCK_POLL_SECONDS`). Checkout is this same page.
 */
useCartStockPoll();

/**
 * Catches the page up when the shopper comes back to it: the server's cart may have changed behind
 * the open screen, and "Place order" is about to act on what is shown.
 */
useCartFocusRefresh();

/**
 * Load cart on mount
 */
onMounted(() =>
    fetchCart().then((cart) => loadProducts((cart?.items ?? []).map(({ productId }) => productId)))
);
</script>

<template>
    <div id="cart-page">
        <!--
            Above both states: a merge in which nothing could be added leaves an EMPTY cart, and
            that is exactly when the shopper most needs to be told why.
        -->
        <MergeReportAlert class="mx-auto mb-4 w-full max-w-4xl" />

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

        <div v-else class="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-cart">
            <div class="flex justify-end lg:col-span-2">
                <TourButton tour="checkout" />
            </div>

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
                        {{ shortfallText(line) }}
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

            <!--
                CART_OPEN_ORDER_LIMIT names the unpaid orders in the way: the fix is paying or
                cancelling one, so each is a link to its page rather than a sentence alone.
            -->
            <v-alert
                v-if="openOrderTargets.length > 0"
                type="warning"
                variant="tonal"
                data-test="cart-open-orders"
                class="lg:col-span-2"
            >
                <p>{{ t('cart-page.error-open-order-limit') }}</p>
                <ul class="mt-2 flex flex-col gap-1">
                    <li v-for="(order, index) in openOrderTargets" :key="order.id">
                        <router-link :to="order.to" data-test="cart-open-order-link">
                            {{ t('cart-page.open-order-link', { n: index + 1 }) }}
                        </router-link>
                    </li>
                </ul>
            </v-alert>

            <!--
                "Place order" is held back while any line cannot be bought; this says why, so the
                shopper is not left with a dead button and no reason.
            -->
            <v-alert
                v-if="linesNeedAttention"
                type="info"
                variant="tonal"
                data-test="cart-lines-need-attention"
                class="lg:col-span-2"
            >
                {{ t('cart-page.error-line-needs-attention') }}
            </v-alert>

            <InlineErrorAlert
                :message="lineActionError"
                class="lg:col-span-2"
                data-test="cart-line-action-error"
            />

            <div class="flex flex-col gap-4" data-tour="checkout-lines">
                <v-card
                    v-for="item in cartItems"
                    :key="'cart-item-' + item.productId"
                    data-test="cart-item"
                    class="p-5"
                >
                    <h2 class="text-lg font-semibold">
                        <b>{{ titleOf(item.productId) }}</b>
                    </h2>
                    <!--
                        A status: the steppers below change it, and a reader should hear the new number.
                        The availability marker lives inside it, so a line turning short is announced
                        without a live region of its own per row. Text, not colour alone.
                    -->
                    <p class="mt-1" role="status">
                        <span class="opacity-80">
                            {{ t('cart-page.label-quantity') }}: {{ lineQuantity(item) }}
                        </span>
                        <v-chip
                            v-if="availabilityLabel(item.availability)"
                            size="small"
                            :color="item.availability === 'preorder' ? 'info' : 'warning'"
                            variant="tonal"
                            label
                            class="ml-2"
                            :data-availability="item.availability"
                            data-test="cart-line-availability"
                        >
                            {{
                                availabilityLabel(
                                    item.availability,
                                    productOf(item.productId)?.releaseDate
                                )
                            }}
                        </v-chip>
                        <!-- Art. 6(1)(k) CRD: told BEFORE buying that this item has no right of withdrawal. -->
                        <v-chip
                            v-if="productOf(item.productId)?.noWithdrawal"
                            size="small"
                            variant="tonal"
                            label
                            class="ml-2"
                            data-test="cart-line-no-withdrawal"
                        >
                            {{ t('cart-page.label-no-withdrawal') }}
                        </v-chip>
                    </p>
                    <!-- Absent until the product read has answered for this line — no price
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
                            :disabled="placing || lineQuantity(item) <= MIN_LINE_QUANTITY"
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
                            :disabled="placing"
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
                <v-card
                    v-if="cartSummary"
                    data-test="cart-summary"
                    data-tour="checkout-summary"
                    class="p-5 lg:sticky lg:top-20"
                >
                    <h2 class="text-lg font-semibold">{{ t('cart-page.label-summary') }}</h2>
                    <dl class="mt-3 grid grid-cols-summary gap-y-1">
                        <dt class="opacity-70">{{ t('cart-page.label-items-count') }}</dt>
                        <dd class="text-right font-medium">{{ cartSummary.itemsCount }}</dd>
                        <dt class="opacity-70">{{ t('cart-page.label-total-quantity') }}</dt>
                        <dd class="text-right font-medium">{{ cartSummary.totalQuantity }}</dd>
                    </dl>
                    <v-divider class="my-3" />
                    <!--
                        A basket with nothing to ship (every line digital) has no method to
                        choose, so the selector is replaced by one plain line rather than shown as
                        an empty heading. The line promises nothing about how a digital good
                        arrives: no channel delivers one yet.
                    -->
                    <p
                        v-if="cartShipping && !cartShipping.required"
                        class="opacity-80"
                        data-test="cart-no-shipping"
                    >
                        {{ t('cart-page.no-shipping-needed') }}
                    </p>
                    <ShippingSelector
                        v-else
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
                        v-if="shipsToAddress"
                        v-model="addressId"
                        :ship-to-countries="shipToCountries"
                        class="mt-3"
                    />
                    <!--
                        Every order carries a billing address for its invoice, so this is always
                        asked: "same as the shipping address" when something ships to one, the
                        book's entries alone otherwise. It binds no ship-to list — an invoice may
                        go anywhere.
                    -->
                    <AddressPicker
                        v-model="billingAddressId"
                        purpose="billing"
                        :same-as-shipping="shipsToAddress"
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
                        data-tour="checkout-notes"
                    />
                    <v-divider class="my-3" />
                    <dl class="grid grid-cols-summary gap-y-1">
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
                        <span
                            class="text-xl font-bold"
                            role="status"
                            data-test="cart-total"
                            data-tour="checkout-total"
                        >
                            {{ formatCurrency(cartSummary.totalPrice, cartSummary.currency) }}
                        </span>
                    </div>
                    <!-- The key terms (withdrawal, delivery) in front of the buyer right before the order
                         (Consumer Rights Directive Art. 6, 8). -->
                    <i18n-t
                        keypath="cart-page.text-order-terms"
                        tag="p"
                        class="mt-4 text-xs opacity-70"
                        data-test="cart-order-terms"
                    >
                        <template #terms>
                            <RouterLink
                                :to="routerLinkI18n({ name: 'StaticTerms' })"
                                class="underline"
                            >
                                {{ t('static-pages.terms.title') }}
                            </RouterLink>
                        </template>
                        <template #privacy>
                            <RouterLink
                                :to="routerLinkI18n({ name: 'StaticPrivacy' })"
                                class="underline"
                            >
                                {{ t('static-pages.privacy.title') }}
                            </RouterLink>
                        </template>
                    </i18n-t>
                    <v-btn
                        color="primary"
                        size="large"
                        block
                        class="mt-2"
                        data-test="cart-checkout"
                        data-tour="checkout-place-order"
                        :disabled="!canCheckout || loading || placing"
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
