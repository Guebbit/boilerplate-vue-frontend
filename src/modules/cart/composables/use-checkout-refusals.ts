/**
 * @module
 * The cart page's answer to a refused checkout. `classifyCheckoutError` turns the rejection into a
 * verdict; this composable maps each verdict kind to its reaction through one exhaustive switch
 * (a toast, inline lines, a cart refetch, a navigation) and owns the state those reactions leave
 * on screen. See `docs/modules/cart-checkout.md` §"The refusals, and why they are shaped
 * differently" for what each answer means.
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { currencyDigits, formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useCartStore } from '../store';
import { classifyCheckoutError, fromMinorUnits } from '../domain';
import type {
    CheckoutErrorVerdict,
    CheckoutShortfallLine,
    ExpectedTotal,
    UnavailableCartLine
} from '../domain';

/**
 * A wire money amount, written the way the rest of the page writes prices.
 *
 * @param money - Minor units plus currency, from `CART_TOTAL_CHANGED`'s details.
 * @returns The amount in the visitor's locale formatting.
 */
const formatMinor = (money: ExpectedTotal) =>
    formatCurrency(fromMinorUnits(money.amount, currencyDigits(money.currency)), money.currency);

/**
 * Hooks the page supplies: the reactions that touch state the page itself owns.
 */
export interface CheckoutRefusalHooks {
    /**
     * The chosen shipping method cannot carry the basket: the page reopens its picker.
     */
    onShippingMethodRefused: () => void;
}

/**
 * Builds the refusal handling for one cart page.
 *
 * @param hooks - The page-owned reactions.
 * @returns The on-screen refusal state, a reset for the next attempt, and the handler itself.
 */
export const useCheckoutRefusals = (hooks: CheckoutRefusalHooks) => {
    /**
     * Translation function.
     */
    const { t } = useI18n();

    /**
     * Router, for the move to the orders list after a 500 that did write the order.
     */
    const router = useRouter();

    /**
     * Toast dispatcher.
     */
    const { addMessage } = useNotificationsStore();

    /**
     * The store's cart read, for the refusals that mean the basket on screen is stale.
     */
    const { fetchCart } = useCartStore();

    /**
     * The cart's lines, read after a 500 to tell a written order from a lost one.
     */
    const { cartItems } = storeToRefs(useCartStore());

    /**
     * The short lines a `CART_INSUFFICIENT_STOCK` refusal named, rendered inline so the customer
     * fixes the basket in one pass. Empty unless the last checkout ended in this refusal.
     */
    const insufficientStockLines = ref<CheckoutShortfallLine[]>([]);

    /**
     * The lines a `CART_PRODUCT_UNAVAILABLE` refusal named — a product removed or hidden since the
     * basket was built. Empty unless the last checkout ended in this refusal.
     */
    const unavailableLines = ref<UnavailableCartLine[]>([]);

    /**
     * The unpaid orders `CART_OPEN_ORDER_LIMIT` named. Empty unless the last checkout ended in this
     * refusal.
     */
    const openOrderIds = ref<string[]>([]);

    /**
     * Raised after a checkout the hold refused, so the hold banner reads the buyer's record again.
     */
    const holdSignal = ref(0);

    /**
     * The checkout button's own blocked state: the generic fallback, and a refetch that failed.
     * Every refusal with a more specific answer keeps its own toast or inline list instead.
     */
    const {
        message: checkoutError,
        report: reportCheckoutError,
        clear: clearCheckoutError
    } = useBlockingError();

    /**
     * The refusal text for a total that moved between what the page showed and what would be
     * charged. Without both amounts (a malformed `details`) it names neither.
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
     * Reads the cart again after a refusal that means the basket on screen is stale. A failing read
     * blocks the checkout button in place rather than vanishing.
     *
     * @returns A promise resolving once the read settles, either way.
     */
    const refetchCart = () =>
        fetchCart().then(
            () => undefined,
            (refetchError: unknown) => reportCheckoutError(refetchError)
        );

    /**
     * Toasts a refusal's message and reads the cart again.
     *
     * @param key - The translation key of the toast.
     * @returns A promise resolving once the read settles.
     */
    const toastAndRefetch = (key: string) => {
        addMessage(t(key));
        return refetchCart();
    };

    /**
     * A bare 500, after which the store read the cart again: an empty cart means the order was
     * written, a full one means nothing was.
     *
     * @param error - The 500 itself, reported when the cart shows nothing was written.
     */
    const reactToServerError = (error: unknown) => {
        if (cartItems.value.length > 0) {
            reportCheckoutError(error);
            return;
        }
        addMessage(t('cart-page.order-placed-after-error'));
        const orders = linkIfRouted(router, 'OrdersList') ?? { name: 'Home' };
        // Fire-and-forget: a NavigationFailure must not turn a written order into an error.
        void router.push(routerLinkI18n(orders));
    };

    /**
     * Clears what the previous attempt left on screen, before the next one.
     */
    const resetRefusals = () => {
        insufficientStockLines.value = [];
        unavailableLines.value = [];
        openOrderIds.value = [];
        clearCheckoutError();
    };

    /**
     * Reacts to one verdict. Exhaustive: a kind added to `CheckoutErrorVerdict` fails the
     * `satisfies never` below until it has a case here.
     *
     * @param verdict - The classified refusal.
     * @param error - The original rejection, for the cases that report it.
     * @returns A promise when the reaction reads the cart again; nothing otherwise.
     */
    const react = (verdict: CheckoutErrorVerdict, error: unknown): Promise<void> | void => {
        switch (verdict.kind) {
            case 'cart-changed': {
                return toastAndRefetch('cart-page.error-cart-changed');
            }
            // The store already read the cart again, so the page shows the new total; the
            // button stays live, and the next press confirms that total.
            case 'total-changed': {
                addMessage(totalChangedMessage(verdict.expected, verdict.actual));
                return;
            }
            case 'insufficient-stock': {
                insufficientStockLines.value = verdict.lines;
                addMessage(t('cart-page.error-insufficient-stock'));
                return;
            }
            case 'address-not-found': {
                addMessage(t('cart-page.error-address-not-found'));
                return;
            }
            case 'billing-address-required': {
                addMessage(t('cart-page.error-billing-address-required'));
                return;
            }
            // The page reopens its picker: the basket weight this client knows is advisory, and
            // the server's enforced check is the one that knows the method cannot carry it.
            case 'shipping-method-weight': {
                hooks.onShippingMethodRefused();
                addMessage(t('cart-page.error-shipping-method-weight'));
                return;
            }
            // The country select already narrows a NEW address to the ship-to list, so the fix
            // is picking (or adding) one, not a field this page can correct for the shopper.
            case 'ship-to-country-not-supported': {
                addMessage(t('cart-page.error-ship-to-country-not-supported'));
                return;
            }
            case 'product-unavailable': {
                unavailableLines.value = verdict.lines;
                addMessage(t('cart-page.error-product-unavailable'));
                return;
            }
            case 'open-order-limit': {
                openOrderIds.value = verdict.orderIds;
                addMessage(t('cart-page.error-open-order-limit'));
                return;
            }
            // The banner carries the reason, the date and the note from the buyer's own record.
            case 'purchase-hold': {
                addMessage(t('cart-page.error-purchase-hold'));
                holdSignal.value += 1;
                return;
            }
            // The server holds no basket: the order a lost answer hid exists.
            case 'cart-empty': {
                return toastAndRefetch('cart-page.error-cart-empty');
            }
            // The store already waited for the first attempt; it is still running.
            case 'in-flight': {
                return toastAndRefetch('cart-page.error-checkout-in-flight');
            }
            case 'server-error': {
                reactToServerError(error);
                return;
            }
            case 'other': {
                reportCheckoutError(error);
                return;
            }
            default: {
                return verdict satisfies never;
            }
        }
    };

    /**
     * Reacts to a refused checkout.
     *
     * @param error - The rejected value `cartStore.checkout()` threw.
     * @returns A promise resolving once the reaction settles (a refetch included).
     */
    const handleRefusal = (error: unknown): Promise<void> =>
        Promise.resolve(react(classifyCheckoutError(error), error));

    return {
        insufficientStockLines,
        unavailableLines,
        openOrderIds,
        holdSignal,
        checkoutError,
        resetRefusals,
        handleRefusal
    };
};
