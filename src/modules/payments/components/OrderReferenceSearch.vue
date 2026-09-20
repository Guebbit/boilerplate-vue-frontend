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
 *
 * A miss and a real failure both block this search from completing, so both render through
 * `InlineErrorAlert` rather than a toast — see docs/theory/request-flow.md.
 */

import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { usePaymentsStore } from '../store.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

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
 * This search's own blocked state — a miss or a real failure alike, since neither lets it
 * complete; only the tone, and whether Faro hears about it, differ.
 */
const {
    message: searchError,
    type: searchErrorType,
    report: reportSearchError,
    warn: warnSearchNotFound,
    clear: clearSearchError
} = useBlockingError();

/**
 * Looks the reference up and jumps to the order it pays. A blank field or an in-flight search is
 * a no-op; a miss or any other failure blocks the search in place ({@link searchError}) rather
 * than navigating nowhere.
 *
 * @returns A promise resolving once the search has settled, one way or another.
 */
const search = () => {
    const typed = reference.value.trim();
    if (!typed || paymentsStore.loading) return Promise.resolve();

    clearSearchError();

    return paymentsStore
        .findOrderByReference(typed)
        .then((order) => {
            if (!order) {
                warnSearchNotFound(t('order-reference-search.error-not-found'));
                return;
            }
            reference.value = '';
            return router.push(routerLinkI18n({ name: 'OrderEdit', params: { id: order.id } }));
        })
        .catch((error: unknown) => reportSearchError(error));
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
            @update:model-value="clearSearchError"
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
        <InlineErrorAlert
            :message="searchError"
            :type="searchErrorType"
            class="w-full"
            test-id="order-reference-search-error"
        />
    </v-card>
</template>
