<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
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
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Search, Plus } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useWebhooksStore } from '@/modules/webhooks/store';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { formatDate, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import type { WebhookSubscription } from '@types';

import { useListSearch } from '@/ui/composables/use-list-search.ts';
import { useListUrlState } from '@/ui/composables/use-list-url-state.ts';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';

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
 * Options of the "enabled" filter select. The "any" row's value is `null`, not `undefined`
 * — Vuetify reads an `undefined` item value as "use the title", which would post the
 * translated label instead of no filter at all.
 *
 * @returns The localized options, re-translated on locale change.
 */
const enabledOptions = computed(() => [
    { value: null, label: t('webhooks-list-page.filter-enabled-all') },
    { value: true, label: t('webhooks-list-page.filter-enabled-yes') },
    { value: false, label: t('webhooks-list-page.filter-enabled-no') }
]);

/**
 * The "enabled" select's model: `null` (the "any" row) on screen, no `enabled` filter in the
 * store.
 */
const enabledChoice = useAnyFilterChoice(
    () => filters.value.enabled,
    (value) => {
        filters.value.enabled = value;
    }
);

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
 * Keeps the filters and page in the URL: a deep link renders filtered, and a reload keeps the view.
 */
const { sync: syncUrl } = useListUrlState({
    filters,
    page: pageCurrent,
    pageSize: pageSize,
    params: { enabled: 'boolean' }
});

/**
 * Search function bound to the store's reactive `filters`/pagination, reporting a failed request
 * as a toast.
 */
const { search } = watchSubscriptionsSearch({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * Apply and clear, both restarting from the first page and keeping the URL in step.
 */
const { handleSearch, handleReset } = useListSearch({
    filters,
    page: pageCurrent,
    search,
    onApplied: syncUrl
});

/**
 * The row action's own blocked state — delete is the table's only write action, behind a confirm
 * dialog that has already closed by the time the request answers, so its own row button has
 * nowhere to host an alert; one lives above the table instead. A search failure is a different
 * kind of thing (ambient, the table just hasn't refreshed) and keeps toasting through
 * {@link notifyErrorMessages} above — see docs/theory/request-flow.md.
 */
const {
    message: rowActionError,
    report: reportRowActionError,
    clear: clearRowActionError
} = useBlockingError();

/**
 * Deletes a subscription after an explicit confirmation.
 *
 * @param subscription - The subscription to delete.
 * @returns A promise settling once the viewer has answered and, if they accepted, the delete has
 *  finished; a failure blocks the list in place ({@link rowActionError}).
 */
const handleDelete = (subscription: WebhookSubscription) =>
    useDialogStore()
        .confirm({
            message: t('webhooks-list-page.confirm-delete', { url: subscription.url }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearRowActionError();
            return deleteSubscription(subscription.id)
                .then(() => addMessage(t('webhooks-list-page.success-delete')))
                .catch((error: unknown) => reportRowActionError(error));
        });
</script>

<template>
    <div id="webhooks-list-page">
        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    <v-select
                        v-model="enabledChoice"
                        data-test="filter-enabled"
                        :label="t('webhooks-list-page.filter-enabled')"
                        :items="enabledOptions"
                        item-title="label"
                        item-value="value"
                        hide-details
                        @update:model-value="handleSearch"
                    />
                    <PageSizeSelect v-model="pageSize" :label="t('generic.page-size')" />
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-2">
                    <v-btn type="submit" color="primary" data-test="search-submit">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" data-test="search-reset" @click="handleReset">
                        {{ t('generic.reset') }}
                    </v-btn>
                    <v-spacer />
                    <v-btn color="secondary" :to="routerLinkI18n({ name: 'WebhookCreate' })">
                        <Plus :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('webhooks-list-page.button-create') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <InlineErrorAlert
            :message="rowActionError"
            class="mb-4"
            data-test="webhooks-list-row-action-error"
        />

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
    </div>
</template>
