<script lang="ts">
export default {
    name: 'ShippingSelector'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Single-file component: `<script setup>` drives a radio group bound to `defineModel`, one radio
 * per fitting, already-priced `options` entry (FA-D6/B3) — the cart's own answer, not a client
 * computation. `shipToCountries` still comes from the delivery store's unfiltered catalogue, the
 * one fact `options` does not carry.
 */

import { onMounted, watch, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { useDeliveryStore } from '../store.ts';
import type { CartShippingOption } from '@types';

/**
 * The cart's shipping choice: one radio per fitting method, already priced by the server against
 * the basket being bought. Selecting nothing is allowed — shipping is not required to buy, and
 * the checkout sends no method for `undefined`.
 */
const { options, currency } = defineProps<{
    /**
     * The cart's own `shipping.options` — every method that currently fits the basket, priced.
     */
    options: CartShippingOption[];
    /**
     * The shop's currency, for formatting each option's price.
     */
    currency: string;
}>();

/**
 * The chosen method's id, or undefined while nothing is selected.
 */
const methodId = defineModel<string | undefined>();

/**
 * Whether the chosen method needs a shipping address — `undefined` while nothing is selected.
 * The caller (`Cart.vue`) reads this to decide whether to require one too, without reaching past
 * this component into the delivery store, which this module does not publish.
 */
const requiresAddress = defineModel<boolean | undefined>('requiresAddress');

/**
 * The deployment's ship-to list (E12) — mirrored out of the delivery store the same way
 * {@link requiresAddress} is, so `Cart.vue` can narrow `AddressPicker`'s country select without
 * reaching past this component into a store `cart` may not import directly.
 */
const shipToCountries = defineModel<string[]>('shipToCountries', { default: () => [] });

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The heading's id: it is the group's label too, so the radios are named by it.
 */
const titleId = useId();

/**
 * Delivery store, for the ship-to list and each method's `freeAbove` — display-only lookups
 * against the unfiltered catalogue. The price itself is never re-derived here: {@link options}
 * already carries what the server computed.
 */
const deliveryStore = useDeliveryStore();

/**
 * The unfiltered methods catalogue and the ship-to list fetched alongside it — both reactive.
 */
const { methods, shipToCountries: storeShipToCountries } = storeToRefs(deliveryStore);

/*
 * Fetches on mount, for `shipToCountries` and {@link freeAboveOf} below — the radios themselves
 * render straight off {@link options}, the caller's own priced, fitting list.
 */
onMounted(() => {
    void deliveryStore.fetchMethods();
});

/**
 * Whether `id` carries a free-above threshold at all, off the unfiltered catalogue —
 * {@link options} carries no `freeAbove`, only the price already computed against it, so this is
 * what tells "free because the threshold was met" apart from a method that is simply always free
 * (`pickup`).
 * @param id - the option's id
 */
const freeAboveOf = (id: string) => methods.value.find((method) => method.id === id)?.freeAbove;

/*
 * Keeps `requiresAddress` in step with the chosen method, off `options` itself — the same fitting
 * list the radios render, so a method that stops fitting (and drops out of `options`) clears this
 * the same way `methodId` itself would need clearing to reach.
 */
watch(
    [methodId, () => options],
    () => {
        requiresAddress.value = options.find(
            (option) => option.id === methodId.value
        )?.requiresAddress;
    },
    { immediate: true }
);

/**
 * Mirrors the store's own ship-to list out to the caller (E12), the same pattern as
 * {@link requiresAddress} above.
 */
watch(
    storeShipToCountries,
    (list) => {
        shipToCountries.value = list;
    },
    { immediate: true }
);
</script>

<template>
    <div data-test="shipping-selector">
        <h3 :id="titleId" class="mb-1 text-base font-semibold">
            {{ t('shipping-selector.title') }}
        </h3>
        <v-radio-group v-model="methodId" :aria-labelledby="titleId">
            <v-radio
                v-for="option in options"
                :key="option.id"
                :value="option.id"
                :data-test="'shipping-method-' + option.id"
            >
                <template #label>
                    <span class="flex items-baseline gap-2">
                        {{ t(`shipping-selector.method-${option.id}`) }}
                        <strong data-test="shipping-price">
                            {{ formatCurrency(option.price, currency) }}
                        </strong>
                        <span
                            v-if="freeAboveOf(option.id) !== undefined && option.price === 0"
                            class="text-xs opacity-75"
                        >
                            {{ t('shipping-selector.free-earned') }}
                        </span>
                    </span>
                </template>
            </v-radio>
        </v-radio-group>
    </div>
</template>
