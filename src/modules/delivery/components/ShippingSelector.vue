<script lang="ts">
export default {
    name: 'ShippingSelector'
};
</script>

<script setup lang="ts">
import { onMounted } from 'vue';
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
    /** The cart's lines total, the number free-above thresholds compare against. */
    itemsTotal: number;
}>();

const methodId = defineModel<string | undefined>();

const { t } = useI18n();
const deliveryStore = useDeliveryStore();
const { methods } = storeToRefs(deliveryStore);

onMounted(() => {
    if (methods.value.length === 0) void deliveryStore.fetchMethods();
});
</script>

<template>
    <div data-test="shipping-selector">
        <h3 class="mb-1 text-base font-semibold">{{ t('shipping-selector.title') }}</h3>
        <v-radio-group v-model="methodId">
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
