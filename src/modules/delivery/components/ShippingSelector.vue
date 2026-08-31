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

import { onMounted, useId } from 'vue';
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
 * The available shipping methods, reactive.
 */
const { methods } = storeToRefs(deliveryStore);

onMounted(() => {
    if (methods.value.length === 0) void deliveryStore.fetchMethods();
});
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
                            {{ formatCurrency(deliveryStore.effectivePrice(method, itemsTotal)) }}
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
