<script lang="ts">
export default {
    name: 'WebhooksListPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Webhook subscriptions list/search page. Wires the store's paginated search to a filter form
 * and a `DataTable`, with per-row view/edit/delete actions.
 */
import { computed } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Search, Plus } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useWebhooksStore } from '@/modules/webhooks/store';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDate, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import type { WebhookSubscription } from '@types';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { useDialogStore } from '@/ui/dialog.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Webhooks store actions.
 */
const { watchSubscriptionsSearch, deleteSubscription } = useWebhooksStore();

/**
 * Webhooks store reactive state — filters, the current page window and the pagination counters.
 */
const {
    subscriptionFilters: filters,
    subscriptionPageItemList: pageItemList,
    subscriptionPageCurrent: pageCurrent,
    subscriptionPageSize: pageSize,
    subscriptionsPageTotal: pageTotal,
    loadingSubscriptions: loading
} = storeToRefs(useWebhooksStore());

/**
 * Row-action button size: `small` on desktop, Vuetify's bigger default below `sm`, where a tap
 * replaces a click and `small` misses the WCAG touch-target recommendation.
 */
const rowActionSize = useTouchFriendlySize();

/**
 * Options of the "enabled" filter select.
 *
 * @returns The localized options, re-translated on locale change.
 */
const enabledOptions = computed(() => [
    { value: undefined, label: t('webhooks-list-page.filter-enabled-all') },
    { value: true, label: t('webhooks-list-page.filter-enabled-yes') },
    { value: false, label: t('webhooks-list-page.filter-enabled-no') }
]);

/**
 * Selectable page sizes for the subscriptions table.
 */
const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' }
];

/**
 * Columns of the subscriptions table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed<CoreDataTableHeader<WebhookSubscription>[]>(() => [
    { title: t('webhooks-list-page.column-id'), key: 'id' },
    { title: t('webhooks-list-page.column-url'), key: 'url' },
    { title: t('webhooks-list-page.column-description'), key: 'description' },
    { title: t('webhooks-list-page.column-event-types'), key: 'eventTypes' },
    { title: t('webhooks-list-page.column-enabled'), key: 'enabled' },
    { title: t('webhooks-list-page.column-created-at'), key: 'createdAt' },
    // Reads no field on the row: the cell is the `item.actions` slot below.
    { title: t('webhooks-list-page.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * Search function bound to the store's reactive `filters`/pagination, reporting a failed request
 * as a toast.
 */
const { search } = watchSubscriptionsSearch({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * Applies the current filters, restarting from the first page.
 *
 * @returns The search promise, resolving once the page is loaded.
 */
const handleSearch = () => {
    pageCurrent.value = 1;
    return search();
};

/**
 * Clears every filter and reloads the first page from the API.
 *
 * @returns The search promise, resolving once the page is loaded.
 */
const handleReset = () => {
    filters.value = {};
    pageCurrent.value = 1;
    return search(true);
};

/**
 * Deletes a subscription after an explicit confirmation.
 *
 * @param subscription - The subscription to delete.
 * @returns A promise settling once the viewer has answered and, if they accepted, the delete has
 *  finished; the outcome is reported as a toast.
 */
const handleDelete = (subscription: WebhookSubscription) =>
    useDialogStore()
        .confirm({ message: t('webhooks-list-page.confirm-delete'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return deleteSubscription(subscription.id)
                .then(() => addMessage(t('webhooks-list-page.success-delete')))
                .catch((error: unknown) => notifyErrorMessages(addMessage, error));
        });
</script>

<template>
    <LayoutDefault id="webhooks-list-page" :title="t('webhooks-list-page.page-title')">
        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    <v-select
                        v-model="filters.enabled"
                        :label="t('webhooks-list-page.filter-enabled')"
                        :items="enabledOptions"
                        item-title="label"
                        item-value="value"
                        hide-details
                        @update:model-value="handleSearch"
                    />
                    <v-select
                        v-model="pageSize"
                        :label="t('generic.page-size')"
                        :items="pageSizeOptions"
                        item-title="label"
                        item-value="value"
                        hide-details
                    />
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-2">
                    <v-btn type="submit" color="primary">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="handleReset">{{ t('generic.reset') }}</v-btn>
                    <v-spacer />
                    <v-btn color="secondary" :to="routerLinkI18n({ name: 'WebhookCreate' })">
                        <Plus :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('webhooks-list-page.button-create') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <DataTable
            :headers="tableHeaders"
            :items="pageItemList"
            :caption="t('webhooks-list-page.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            :no-data-text="t('generic.no-data')"
        >
            <template v-slot:[`item.description`]="{ item }">
                {{ item.description ?? EMPTY_VALUE }}
            </template>

            <template v-slot:[`item.eventTypes`]="{ item }">
                <div class="flex flex-wrap gap-1">
                    <v-chip
                        v-for="eventType in item.eventTypes"
                        :key="eventType"
                        size="small"
                        variant="tonal"
                        color="tertiary"
                    >
                        {{ eventType }}
                    </v-chip>
                </div>
            </template>

            <template v-slot:[`item.enabled`]="{ item }">
                <v-chip size="small" variant="tonal" :color="item.enabled ? 'success' : 'error'">
                    {{
                        item.enabled
                            ? t('webhooks-list-page.status-enabled')
                            : t('webhooks-list-page.status-disabled')
                    }}
                </v-chip>
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="flex flex-wrap gap-1">
                    <v-btn
                        :size="rowActionSize"
                        variant="tonal"
                        data-test="row-view"
                        :aria-label="t('webhooks-list-page.button-view-named', { url: item.url })"
                        :to="routerLinkI18n({ name: 'WebhookTarget', params: { id: item.id } })"
                    >
                        {{ t('webhooks-list-page.button-view') }}
                    </v-btn>
                    <v-btn
                        :size="rowActionSize"
                        variant="tonal"
                        color="secondary"
                        data-test="row-edit"
                        :aria-label="t('webhooks-list-page.button-edit-named', { url: item.url })"
                        :to="routerLinkI18n({ name: 'WebhookEdit', params: { id: item.id } })"
                    >
                        {{ t('webhooks-list-page.button-edit') }}
                    </v-btn>
                    <v-btn
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-delete"
                        :aria-label="t('webhooks-list-page.button-delete-named', { url: item.url })"
                        :disabled="loading"
                        @click.stop="handleDelete(item)"
                    >
                        {{ t('webhooks-list-page.button-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>
