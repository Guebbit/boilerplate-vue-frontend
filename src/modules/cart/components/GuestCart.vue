<script setup lang="ts">
/**
 * @module
 * The cart a signed-out visitor sees: the lines they added, kept in their browser, priced by one
 * batched product read. It has no shipping, address or payment, because checkout needs an
 * account; what it offers instead is a way to sign in and come straight back here, where the same
 * lines are waiting in the real cart. A product the read no longer returns (hidden or deleted) stays
 * in the cart, marked "No longer available" with its Remove button: only the shopper drops a line,
 * and a hidden product that comes back is still there.
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Minus, Plus, ShoppingCart } from 'lucide-vue-next';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { shopCurrency } from '@/infrastructure/shop.ts';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useProductLines } from '@/modules/products';
import { MAX_GUEST_LINE_QUANTITY } from '../domain';
import type { GuestCartLine } from '../domain';
import { useCartStore } from '../store';

/**
 * Translation function, and the language on screen: a product read that a language switch
 * cancelled answers empty, which must not be mistaken for "the product is gone".
 */
const { t, locale } = useI18n();

/**
 * The current route, remembered as where sign-in should bring the visitor back to.
 */
const route = useRoute();

/**
 * The router, for the `hasRoute` check behind the sign-in link.
 */
const router = useRouter();

/**
 * The cart store: the guest list, and the writes that change it.
 */
const cartStore = useCartStore();

/**
 * The guest lines and their unit count, reactive.
 */
const { guestLines, guestQuantity } = storeToRefs(cartStore);

/**
 * The lines' product join: one batched read, then title and price off the products dictionary.
 */
const { loadProducts, productOf, titleOf, availabilityLabel, isRemoved } = useProductLines();

/**
 * Whether the last product read answered in full, in the language still on screen. Only then does
 * a missing product mean "gone": a failed or cancelled read is no evidence of it.
 */
const readAnswered = ref(false);

/**
 * The page's blocked state, for a product read that failed. The lines stay as they are.
 */
const { message: loadError, report: reportLoadError, clear: clearLoadError } = useBlockingError();

/**
 * Where "Sign in to check out" goes: the login page, remembering this one. `undefined` on a build
 * with no account module, which hides the button rather than throwing on an unknown route.
 */
const signInTo = computed(() => {
    const target = linkIfRouted(router, 'Login', undefined, { continue: route.fullPath });
    return target && routerLinkI18n(target);
});

/**
 * Whether every line has its product, so a total can be stated without guessing at a price.
 */
const allPriced = computed(() =>
    guestLines.value.every(({ productId }) => productOf(productId) !== undefined)
);

/**
 * The currency of the lines' prices, falling back to the shop's.
 */
const currency = computed(
    () =>
        guestLines.value
            .map(({ productId }) => productOf(productId)?.currency)
            .find((code) => code !== undefined) ?? shopCurrency.value
);

/**
 * What the lines cost together, before shipping, which only a signed-in checkout can price.
 */
const itemsTotal = computed(() =>
    guestLines.value.reduce(
        (sum, { productId, quantity }) => sum + (productOf(productId)?.price ?? 0) * quantity,
        0
    )
);

/**
 * Reads the products behind the lines, to price them. A line whose product did not come back is
 * left alone: the template marks it removed, and only the shopper takes it out.
 *
 * @returns A promise settling once the lines are priced.
 */
const refreshLines = () => {
    const languageAtStart = locale.value;
    clearLoadError();
    readAnswered.value = false;
    return loadProducts(guestLines.value.map(({ productId }) => productId))
        .then(() => {
            readAnswered.value = locale.value === languageAtStart;
        })
        .catch(reportLoadError);
};

/**
 * Whether a line's product is gone for this visitor, as far as the last read can say.
 *
 * @param productId - The line's product.
 * @returns `true` once a full read has answered without it.
 */
const isGone = (productId: string): boolean => readAnswered.value && isRemoved(productId);

/**
 * Whether a line's product is still listed but off sale (`purchasable: false`), as the public
 * read says it. The signed-in cart marks the same line "Not available right now".
 *
 * @param productId - The line's product.
 * @returns `true` once the read has answered with the product flagged not purchasable.
 */
const isOffSale = (productId: string): boolean => productOf(productId)?.purchasable === false;

/**
 * Steps a line's quantity by one, within what a line may hold.
 *
 * @param line - The line to change.
 * @param step - `1` or `-1`.
 */
const stepLine = ({ productId, quantity }: GuestCartLine, step: number) =>
    cartStore.updateGuestItem(productId, quantity + step);

/**
 * Removes one line.
 *
 * @param productId - The line's product.
 */
const removeLine = (productId: string) => cartStore.removeGuestItems([productId]);

/**
 * Empties the cart after an explicit confirmation, as the signed-in cart does.
 *
 * @returns A promise settling once the visitor decides.
 */
const handleClearCart = () => {
    const count = guestLines.value.length;
    return useDialogStore()
        .confirm({ message: t('cart-page.confirm-clear', { count }, count), color: 'error' })
        .then((accepted) => {
            if (accepted) cartStore.clearGuestCart();
        });
};

onMounted(refreshLines);
</script>

<template>
    <div id="cart-page" data-test="guest-cart">
        <v-empty-state v-if="guestLines.length === 0" :title="t('cart-page.empty-cart')">
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
            <InlineErrorAlert
                :message="loadError"
                class="lg:col-span-2"
                data-test="guest-cart-error"
            />

            <div class="flex flex-col gap-4">
                <v-card
                    v-for="line in guestLines"
                    :key="'guest-cart-item-' + line.productId"
                    data-test="guest-cart-item"
                    class="p-5"
                >
                    <h2 class="text-lg font-semibold">
                        <b>{{ titleOf(line.productId) }}</b>
                    </h2>
                    <!-- A status: the steppers below change it, and a reader should hear the new number. -->
                    <p class="mt-1 opacity-80" role="status">
                        {{ t('cart-page.label-quantity') }}: {{ line.quantity }}
                        <v-chip
                            v-if="isGone(line.productId)"
                            size="small"
                            color="warning"
                            variant="tonal"
                            label
                            class="ml-2"
                            data-test="guest-cart-line-removed"
                        >
                            {{ availabilityLabel('removed') }}
                        </v-chip>
                        <v-chip
                            v-else-if="isOffSale(line.productId)"
                            size="small"
                            color="warning"
                            variant="tonal"
                            label
                            class="ml-2"
                            data-test="guest-cart-line-unavailable"
                        >
                            {{ availabilityLabel('unavailable') }}
                        </v-chip>
                    </p>
                    <p
                        v-if="productOf(line.productId)"
                        class="mt-1 opacity-80"
                        data-test="guest-cart-line-price"
                    >
                        {{
                            formatCurrency(
                                productOf(line.productId)?.price,
                                productOf(line.productId)?.currency ?? ''
                            )
                        }}
                        × {{ line.quantity }} =
                        {{
                            formatCurrency(
                                (productOf(line.productId)?.price ?? 0) * line.quantity,
                                productOf(line.productId)?.currency ?? ''
                            )
                        }}
                    </p>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                        <v-btn
                            icon
                            size="small"
                            variant="tonal"
                            data-test="guest-cart-decrease"
                            :disabled="line.quantity <= 1"
                            :aria-label="
                                t('cart-page.button-decrease-named', {
                                    id: titleOf(line.productId)
                                })
                            "
                            @click="stepLine(line, -1)"
                        >
                            <Minus :size="16" aria-hidden="true" />
                        </v-btn>
                        <v-btn
                            icon
                            size="small"
                            variant="tonal"
                            data-test="guest-cart-increase"
                            :disabled="line.quantity >= MAX_GUEST_LINE_QUANTITY"
                            :aria-label="
                                t('cart-page.button-increase-named', {
                                    id: titleOf(line.productId)
                                })
                            "
                            @click="stepLine(line, 1)"
                        >
                            <Plus :size="16" aria-hidden="true" />
                        </v-btn>
                        <v-btn
                            variant="text"
                            color="error"
                            data-test="guest-cart-remove"
                            :aria-label="
                                t('cart-page.button-remove-named', {
                                    id: titleOf(line.productId)
                                })
                            "
                            @click="removeLine(line.productId)"
                        >
                            {{ t('cart-page.button-remove') }}
                        </v-btn>
                    </div>
                </v-card>
            </div>

            <div class="flex flex-col gap-4">
                <v-card data-test="guest-cart-summary" class="p-5 lg:sticky lg:top-20">
                    <h2 class="text-lg font-semibold">{{ t('cart-page.label-summary') }}</h2>
                    <dl class="mt-3 grid grid-cols-[1fr_auto] gap-y-1">
                        <dt class="opacity-70">{{ t('cart-page.label-items-count') }}</dt>
                        <dd class="text-right font-medium">{{ guestLines.length }}</dd>
                        <dt class="opacity-70">{{ t('cart-page.label-total-quantity') }}</dt>
                        <dd class="text-right font-medium">{{ guestQuantity }}</dd>
                        <template v-if="allPriced">
                            <dt class="opacity-70">{{ t('cart-page.label-items-total') }}</dt>
                            <dd class="text-right font-medium" data-test="guest-cart-total">
                                {{ formatCurrency(itemsTotal, currency) }}
                            </dd>
                        </template>
                    </dl>
                    <p class="mt-3 text-sm opacity-80" data-test="guest-cart-intro">
                        {{ t('guest-cart-page.intro') }}
                    </p>
                    <v-btn
                        v-if="signInTo"
                        color="primary"
                        size="large"
                        block
                        class="mt-4"
                        data-test="guest-cart-sign-in"
                        :to="signInTo"
                    >
                        {{ t('guest-cart-page.button-sign-in') }}
                    </v-btn>
                    <v-btn
                        variant="text"
                        block
                        class="mt-2"
                        data-test="guest-cart-clear"
                        @click="handleClearCart"
                    >
                        {{ t('cart-page.button-clear') }}
                    </v-btn>
                </v-card>
            </div>
        </div>
    </div>
</template>
