<script lang="ts">
export default {
    name: 'PaymentMethodSelector'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Single-file component: `<script setup>` reads the payments store's methods (fetching them once
 * on mount if empty) and drives a radio group bound to `defineModel`. Renders nothing while only
 * `card` is offered — a choice between one option is not a choice.
 */

import { onMounted, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { PaymentMethodId } from '@types';
import { usePaymentsStore } from '../store.ts';

/**
 * The chosen method's id, or undefined while nothing is selected — the checkout defaults to
 * `card` server-side when none is sent.
 */
const methodId = defineModel<PaymentMethodId | undefined>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The heading's id: it is the group's label too, so the radios are named by it.
 */
const titleId = useId();

/**
 * Payments store, for the methods list.
 */
const paymentsStore = usePaymentsStore();

/**
 * The available payment methods, reactive.
 */
const { methods } = storeToRefs(paymentsStore);

onMounted(() => {
    if (methods.value.length === 0) void paymentsStore.fetchMethods();
});
</script>

<template>
    <div v-if="methods.length > 1" data-test="payment-method-selector">
        <h3 :id="titleId" class="mb-1 text-base font-semibold">
            {{ t('payment-method-selector.title') }}
        </h3>
        <v-radio-group v-model="methodId" :aria-labelledby="titleId">
            <v-radio
                v-for="method in methods"
                :key="method.id"
                :value="method.id"
                :data-test="'payment-method-' + method.id"
            >
                <template #label>
                    {{ t(`payment-method-selector.method-${method.id}`) }}
                </template>
            </v-radio>
        </v-radio-group>
    </div>
</template>
