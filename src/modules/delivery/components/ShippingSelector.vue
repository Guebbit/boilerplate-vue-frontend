<script lang="ts">
export default {
    name: 'ShippingSelector'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Single-file component: `<script setup>` reads the delivery store's methods (fetching them
 * once on mount if empty) and drives a radio group bound to `defineModel`; pricing math is
 * delegated to the store so the template only formats and displays it.
 */

import { onMounted, watch, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { useDeliveryStore } from '../store.ts';

/**
 * The cart's shipping choice: one radio per method, priced against the basket being bought so
 * the free-above rule is visible while it is being earned. Selecting nothing is allowed —
 * shipping is not required to buy, and the checkout sends no method for `undefined`.
 */
const { itemsTotal } = defineProps<{
    /**
     * The cart's lines total, the number free-above thresholds compare against.
     */
    itemsTotal: number;
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
 * Delivery store, for the methods list.
 */
const deliveryStore = useDeliveryStore();

/**
 * The available shipping methods, and the ship-to list fetched alongside them — both reactive.
 */
const { methods, shipToCountries: storeShipToCountries } = storeToRefs(deliveryStore);

/*
 * Fetches on mount. The list is the same unfiltered catalogue everywhere it's read (the order
 * page's `ShipmentPanel` also calls `fetchMethods()`), so there is nothing left to re-fetch for —
 * weight-fit is now checked server-side, at the point of choosing, not by filtering this list.
 */
onMounted(() => {
    void deliveryStore.fetchMethods();
});

/*
 * Keeps `requiresAddress` in step with the chosen method, including a method that vanishes from
 * the list (a re-fetch by weight can drop the one already picked) — `find` then answers
 * `undefined`, the same "nothing chosen" state `methodId` itself would need clearing to reach.
 */
watch(
    [methodId, methods],
    () => {
        requiresAddress.value = methods.value.find(
            (method) => method.id === methodId.value
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
                v-for="method in methods"
                :key="method.id"
                :value="method.id"
                :data-test="'shipping-method-' + method.id"
            >
                <template #label>
                    <span class="flex items-baseline gap-2">
                        {{ t(`shipping-selector.method-${method.id}`) }}
                        <strong data-test="shipping-price">
                            {{
                                formatCurrency(
                                    deliveryStore.effectivePrice(method, itemsTotal),
                                    method.currency
                                )
                            }}
                        </strong>
                        <span
                            v-if="
                                method.freeAbove !== undefined &&
                                deliveryStore.effectivePrice(method, itemsTotal) === 0
                            "
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
