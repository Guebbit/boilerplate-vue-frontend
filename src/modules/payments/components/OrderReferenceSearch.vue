<script lang="ts">
export default {
    name: 'OrderReferenceSearch'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The admin's own way in when a bank statement line, not an order, is what they are holding: paste
 * the RF creditor reference and jump straight to that order's edit page, where
 * `RecordOfflinePaymentForm` already lives. Published only to an operator who could act on what it
 * finds — `payments.any.create`, the same key that gates recording the payment itself.
 */

import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { usePaymentsStore } from '../store.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher for a lookup that finds nothing, or fails outright.
 */
const { addMessage } = useNotificationsStore();

/**
 * Router instance, for the jump to the found order's edit page.
 */
const router = useRouter();

/**
 * The payments store, held for its one read.
 */
const paymentsStore = usePaymentsStore();

/**
 * The reference as typed, cleared once a search lands on a real order.
 */
const reference = ref('');

/**
 * Looks the reference up and jumps to the order it pays. A blank field or an in-flight search is
 * a no-op; not found or any other failure surfaces as a toast rather than navigating nowhere.
 *
 * @returns A promise resolving once the search has settled, one way or another.
 */
const search = () => {
    const typed = reference.value.trim();
    if (!typed || paymentsStore.loading) return Promise.resolve();

    return paymentsStore
        .findOrderByReference(typed)
        .then((order) => {
            if (!order) return;
            reference.value = '';
            return router.push(routerLinkI18n({ name: 'OrderEdit', params: { id: order.id } }));
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};
</script>

<template>
    <v-card class="mb-6 flex flex-wrap items-end gap-3 p-5" data-test="order-reference-search">
        <v-text-field
            v-model="reference"
            :label="t('order-reference-search.label-reference')"
            :hint="t('order-reference-search.hint-reference')"
            persistent-hint
            density="compact"
            class="min-w-64 flex-1"
            data-test="order-reference-search-input"
            @keyup.enter="search"
        />
        <v-btn
            color="primary"
            variant="tonal"
            :disabled="!reference.trim() || paymentsStore.loading"
            data-test="order-reference-search-submit"
            @click="search"
        >
            {{ t('order-reference-search.button-search') }}
        </v-btn>
    </v-card>
</template>
