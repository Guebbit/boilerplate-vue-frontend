<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AttentionList'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The "Needs attention" tab: only problems still recorded on a document, so a fixed one
 * disappears on the next read. It refuses nothing and repairs nothing — it shows, and links to the
 * order where the existing actions live. An amount mismatch is deliberately not here: it is an
 * audit row, not stored state, so the tab points at the audit log instead.
 */
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { RotateCw } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatCurrency, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { usePaymentsStore } from '../store.ts';

/**
 * Translation function and toast dispatcher.
 */
const { t } = useI18n();

/**
 * Toast dispatcher: a failed read is ambient.
 */
const { addMessage } = useNotificationsStore();

/**
 * The router, for the `hasRoute` guards on the two links out.
 */
const router = useRouter();

/**
 * The store: the items and the loading flag.
 */
const store = usePaymentsStore();

/**
 * The reactive slice of the store this list renders.
 */
const { attention, loading } = storeToRefs(store);

/**
 * Loads the items, oldest first as the API answers them.
 *
 * @returns A promise settling once the read finished or the failure was toasted.
 */
const load = () =>
    store.fetchAttention().catch((error: unknown) => notifyErrorMessages(addMessage, error));

onMounted(() => {
    void load();
});

/**
 * The items with a key of their own: nothing on an item is unique by itself (one order can have
 * several problems, and `since` can repeat), and the table needs one value per row.
 */
const rows = computed(() =>
    attention.value.map((item, index) => ({
        ...item,
        rowKey: `${item.kind}-${item.orderId}-${item.refundId ?? item.paymentId ?? ''}-${index}`
    }))
);

/**
 * Columns of the attention table.
 */
const headers = computed<CoreDataTableHeader<(typeof rows.value)[number]>[]>(() => [
    { title: t('payments-list-page.column-problem'), key: 'kind' },
    { title: t('payments-list-page.column-since'), key: 'since' },
    { title: t('payments-list-page.column-amount'), key: 'amount' },
    { title: t('payments-list-page.column-order'), key: 'orderId', synthetic: true }
]);

/**
 * An order's page, or nothing when this build ships no `orders` module.
 *
 * @param orderId - The order.
 */
const orderLink = (orderId: string) => {
    const target = linkIfRouted(router, 'OrderTarget', { id: orderId });
    return target ? routerLinkI18n(target) : undefined;
};

/**
 * The audit log's page, or nothing when this build ships none.
 */
const auditLink = computed(() => {
    const target = linkIfRouted(router, 'AuditLog');
    return target ? routerLinkI18n(target) : undefined;
});
</script>

<template>
    <div data-test="payments-attention">
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <p class="text-sm opacity-75">{{ t('payments-list-page.attention-hint') }}</p>
            <v-spacer />
            <v-btn
                size="small"
                variant="tonal"
                :disabled="loading"
                data-test="attention-reload"
                @click="load"
            >
                <RotateCw :size="16" class="mr-1" aria-hidden="true" />
                {{ t('payments-list-page.button-reload') }}
            </v-btn>
        </div>

        <v-empty-state
            v-if="attention.length === 0 && !loading"
            :title="t('payments-list-page.empty-attention')"
        />

        <DataTable
            v-else
            :headers="headers"
            :items="rows"
            item-value="rowKey"
            :caption="t('payments-list-page.table-caption-attention')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            row-test="attention-row"
        >
            <template v-slot:[`item.kind`]="{ item }">
                <span data-test="attention-kind">
                    {{ t(`payments-list-page.attention-kind-${item.kind}`) }}
                </span>
                <p
                    v-if="item.failureReason"
                    class="mt-1 text-xs"
                    data-test="attention-failure-reason"
                >
                    {{ t(`payments-list-page.failure-reason-${item.failureReason}`) }}
                </p>
            </template>
            <template v-slot:[`item.since`]="{ item }">
                {{ formatDateTime(item.since) }}
            </template>
            <template v-slot:[`item.amount`]="{ item }">
                {{
                    item.amount !== undefined && item.currency
                        ? formatCurrency(item.amount, item.currency)
                        : EMPTY_VALUE
                }}
            </template>
            <template v-slot:[`item.orderId`]="{ item }">
                <router-link
                    v-if="orderLink(item.orderId)"
                    :to="orderLink(item.orderId)!"
                    class="underline"
                    data-test="attention-order-link"
                >
                    {{ item.orderId }}
                </router-link>
                <span v-else>{{ item.orderId }}</span>
            </template>
        </DataTable>

        <p class="mt-6 text-sm opacity-75" data-test="attention-audit-note">
            {{ t('payments-list-page.attention-audit-note') }}
            <router-link v-if="auditLink" :to="auditLink" class="underline">
                {{ t('payments-list-page.attention-audit-link') }}
            </router-link>
        </p>
    </div>
</template>
