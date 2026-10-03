<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'OrderReferenceSearch'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The admin's own way in when a bank statement line, not an order, is what they are holding: paste
 * the RF creditor reference and find the order it belongs to. Published only to an operator who
 * could act on what it finds — `payments.any.create`, the same key that gates recording the
 * payment itself.
 *
 * `payments` declares no `MODULE_EDGES` reach into `orders` — this component is published
 * for ANY host to mount, and a host is not guaranteed to have `orders` at all — so it emits the
 * found order rather than navigating to its edit page itself; `OrdersList.vue`, which owns that
 * route directly, does the jump.
 *
 * A miss and a real failure both block this search from completing, so both render through
 * `InlineErrorAlert` rather than a toast — see docs/theory/request-flow.md.
 */

import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { usePaymentsStore } from '../store.ts';
import type { Order } from '@types';

/**
 * Fires once a reference search actually lands on an order — the host decides what "found" means
 * for it (`OrdersList.vue` jumps to `OrderEdit`); this component names no route at all.
 */
const emit = defineEmits<{ found: [order: Order] }>();

/**
 * Translation function.
 */
const { t } = useI18n();

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
 * Looks the reference up and emits the order it pays, for the host to act on. A blank field or an
 * in-flight search is a no-op; a miss or any other failure blocks the search in place
 * ({@link searchError}) rather than emitting nothing.
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
            emit('found', order);
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
            data-test="order-reference-search-error"
        />
    </v-card>
</template>
