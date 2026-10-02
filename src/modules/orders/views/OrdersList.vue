<script lang="ts">
export default {
    name: 'OrdersListPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Orders list/search page. Wires the store's paginated search to a filter
 * form and a `DataTable`, with per-row view/edit/delete/hard-delete actions
 * gated on the signed-in role. The RF-reference lookup beside it is `payments`' own
 * `OrderReferenceSearch`, mounted here rather than reimplemented: the page stays a list.
 */
import { shopCurrency } from '@/infrastructure/shop-currency.ts';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { OrderReferenceSearch } from '@/modules/payments';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatCurrency, formatDate } from '@/infrastructure/utils/formatters.ts';
import type { Order } from '@types';
import { OrderStatus } from '@/types/enums.ts';

import { useListSearch } from '@/ui/composables/use-list-search.ts';
import { useListUrlState } from '@/ui/composables/use-list-url-state.ts';
import { useServerSort } from '@/ui/composables/use-server-sort.ts';
import { sortFieldsOf } from '@/infrastructure/utils/sort.ts';
import { OrderSortItem } from '@/types/enums.ts';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useDeletedFilterOptions } from '@/ui/composables/use-deleted-filter-options.ts';

/**
 * Generic translation and notification accessors.
 */
const { t } = useI18n();

/**
 * Router instance, for the jump `handleReferenceFound` performs.
 */
const router = useRouter();

/**
 * `OrderReferenceSearch`'s own `@found` handler — that component names no route at all (FA86),
 * so this page, which owns `OrderEdit` directly, is what turns a found order into a navigation.
 *
 * @param order - The order the reference search landed on.
 */
const handleReferenceFound = (order: Order) =>
    router.push(routerLinkI18n({ name: 'OrderEdit', params: { id: order.id } }));

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Orders store actions and reactive list/pagination state.
 */
const { watchSearchOrders, deleteOrder, hardDeleteOrder, restoreOrder } = useOrdersStore();

/**
 * Options of the staff-only "Deleted" filter.
 */
const deletedOptions = useDeletedFilterOptions();

/**
 * Orders store reactive state — filters, the current page window and the pagination counters.
 */
const {
    filters,
    ordersList,
    pageItemList,
    selectedOrderId,
    pageCurrent,
    pageTotal,
    pageSize,
    loading
} = storeToRefs(useOrdersStore());

/**
 * Whether the signed-in user may see the admin-only row actions.
 */
const session = useSessionStore();

/**
 * Whether the viewer works the orders of OTHER people: the search-by-id/user/product/email boxes
 * and the transfer queue mean nothing to a customer, whose list is already only their own. The
 * wide read (`orders.any.read`) is what makes the list theirs to search, so the warehouse and
 * support, who read every order and edit none, get the filters too.
 */
const isStaff = computed(() => session.canOnOthers('read', 'Order'));

/**
 * Row-action button size: `small` on desktop, Vuetify's bigger default below `sm`, where a tap
 * replaces a click and `small` misses the WCAG touch-target recommendation.
 */
const rowActionSize = useTouchFriendlySize();

/**
 * Columns of the orders table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed<CoreDataTableHeader<Order>[]>(() => [
    // Sorts by the id (creation order, which the number follows); the cell shows the number.
    { title: t('orders-list-page.column-order'), key: 'id' },
    { title: t('orders-list-page.column-status'), key: 'status' },
    { title: t('orders-list-page.column-total'), key: 'totalPrice' },
    { title: t('orders-list-page.column-date'), key: 'createdAt' },
    // Reads no field on the row: the cell is the `item.actions` slot below.
    { title: t('orders-list-page.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * Keeps the filters and page in the URL: a deep link renders filtered, and a reload keeps the view.
 */
const { sync: syncUrl } = useListUrlState({
    filters,
    page: pageCurrent,
    pageSize: pageSize,
    params: {
        id: 'string',
        userId: 'string',
        productId: 'string',
        email: 'string',
        status: Object.values(OrderStatus),
        paymentMethod: 'string',
        deleted: 'boolean',
        sort: 'string'
    }
});

/**
 * Search function bound to the store's reactive `filters`/pagination, reporting
 * a failed request as a toast.
 */
const { search } = watchSearchOrders({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * Semantic theme color per order status. `satisfies` requires every `OrderStatus` member to
 * appear here, so a status added to the contract fails the type check instead of rendering grey.
 */
const STATUS_COLORS = {
    pending: 'warning',
    paid: 'info',
    processing: 'info',
    shipped: 'secondary',
    delivered: 'success',
    cancelled: 'error'
} satisfies Record<OrderStatus, string>;

/**
 * Maps an order status onto a semantic theme color.
 *
 * @param status - Order status, possibly unset.
 * @returns The Vuetify color name, defaulting to `secondary`.
 */
const statusColor = (status?: OrderStatus) => (status ? STATUS_COLORS[status] : 'secondary');

/**
 * The status select's options: every `OrderStatus`, plus "any", re-translated on locale change.
 * The "any" row's value is `null`, not `undefined` (FA51) — Vuetify reads an `undefined` item
 * value as "use the title", which would post the translated label instead of no filter at all.
 */
const statusOptions = computed(() => [
    { value: null, label: t('orders-list-page.filter-status-any') },
    ...Object.values(OrderStatus).map((status) => ({
        value: status,
        label: t(`orders-form.status-${status}`)
    }))
]);

/**
 * The status select's model: `null` (the "any" row) on screen, no `status` filter in
 * {@link filters}.
 */
const statusChoice = useAnyFilterChoice(
    () => filters.value.status,
    (value) => {
        filters.value.status = value;
    }
);

/**
 * The "Deleted" select's model: `null` (the "any" row) on screen, no `deleted` filter in
 * {@link filters}.
 */
const deletedChoice = useAnyFilterChoice(
    () => filters.value.deleted,
    (value) => {
        filters.value.deleted = value;
    }
);

/**
 * The "awaiting transfer" filter: a `pending` order placed with `bank_transfer`, the two fields
 * an operator needs to find money still owed on a checkout choice rather than a card decline.
 * Modelled as one toggle over two filter fields, since neither is useful alone in this view.
 */
const awaitingTransferOnly = computed<boolean>({
    get: () =>
        filters.value.status === 'pending' && filters.value.paymentMethod === 'bank_transfer',
    set: (value) => {
        filters.value.status = value ? 'pending' : undefined;
        filters.value.paymentMethod = value ? 'bank_transfer' : undefined;
    }
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
 * The columns the API can order by (the contract's `OrderSort` enum) — the table's other headers
 * stay inert rather than reorder one page.
 */
const sortableKeys = sortFieldsOf(OrderSortItem);

/**
 * The header's sort state, kept in `filters.sort` so it travels in the URL and the request.
 */
const { sortBy } = useServerSort({ filters, apply: handleSearch });

/**
 * The row actions' own blocked state — delete and hard-delete share one instance, since both
 * are write actions behind a confirm dialog rather than a form with its own field to block: the
 * table keeps working either way, so one alert above it is where a failure belongs. A search
 * failure is a different kind of thing (ambient, the table just hasn't refreshed) and keeps
 * toasting through {@link notifyErrorMessages} above — see docs/theory/request-flow.md.
 */
const {
    message: rowActionError,
    report: reportRowActionError,
    clear: clearRowActionError
} = useBlockingError();

/**
 * Deletes an order after an explicit confirmation.
 *
 * @param orderId - Identifier of the order to delete.
 * @returns A promise settling once the viewer has answered and, if they accepted, the
 *  delete has finished; a failure blocks the list in place ({@link rowActionError}).
 */
const handleDelete = (orderId: string) =>
    useDialogStore()
        .confirm({
            message: t('orders-list-page.confirm-delete', { id: orderId }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearRowActionError();
            return deleteOrder(orderId)
                .then(() => addMessage(t('orders-list-page.success-delete')))
                .catch((error: unknown) => reportRowActionError(error));
        });

/**
 * Undoes a soft delete. No confirmation: nothing is lost by it, and a mistaken restore is one
 * delete away. The list is reloaded afterwards, since the active filter may no longer match.
 *
 * @param orderId - Identifier of the order to restore.
 * @returns A promise settling once the restore and the reload have finished; a failure blocks the
 *  list in place ({@link rowActionError}).
 */
const handleRestore = (orderId: string) => {
    clearRowActionError();
    return restoreOrder(orderId)
        .then(() => addMessage(t('orders-list-page.success-restore')))
        .then(() => search(true))
        .catch((error: unknown) => reportRowActionError(error));
};

/**
 * Permanently deletes an order after an explicit confirmation. Unlike {@link handleDelete}, this
 * bypasses the soft-delete and cannot be undone.
 *
 * @param orderId - Identifier of the order to hard-delete.
 * @returns A promise settling once the viewer has answered and, if they accepted, the
 *  hard-delete has finished; a failure blocks the list in place ({@link rowActionError}).
 */
const handleHardDelete = (orderId: string) =>
    useDialogStore()
        .confirm({
            message: t('orders-list-page.confirm-hard-delete', { id: orderId }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearRowActionError();
            return hardDeleteOrder(orderId)
                .then(() => addMessage(t('orders-list-page.success-hard-delete')))
                .catch((error: unknown) => reportRowActionError(error));
        });
</script>

<template>
    <div id="orders-list-page">
        <OrderReferenceSearch
            v-if="session.can('create', 'Payment')"
            @found="handleReferenceFound"
        />

        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <v-text-field
                        v-if="isStaff"
                        v-model="filters.id"
                        :label="t('orders-list-page.filter-id')"
                        data-test="filter-id"
                        hide-details
                    />
                    <v-text-field
                        v-if="isStaff"
                        v-model="filters.userId"
                        :label="t('orders-list-page.filter-user-id')"
                        data-test="filter-user-id"
                        hide-details
                    />
                    <v-text-field
                        v-if="isStaff"
                        v-model="filters.productId"
                        :label="t('orders-list-page.filter-product-id')"
                        data-test="filter-product-id"
                        hide-details
                    />
                    <v-text-field
                        v-if="isStaff"
                        v-model="filters.email"
                        :label="t('orders-list-page.filter-email')"
                        data-test="filter-email"
                        hide-details
                    />
                    <v-select
                        v-model="statusChoice"
                        :label="t('orders-list-page.filter-status')"
                        :items="statusOptions"
                        item-title="label"
                        item-value="value"
                        data-test="filter-status"
                        hide-details
                    />
                    <v-select
                        v-if="session.can('delete', 'Order')"
                        v-model="deletedChoice"
                        :label="t('generic.filter-deleted')"
                        :items="deletedOptions"
                        item-title="label"
                        item-value="value"
                        data-test="filter-deleted"
                        hide-details
                    />
                    <PageSizeSelect v-model="pageSize" :label="t('generic.page-size')" />
                </div>
                <v-checkbox
                    v-if="isStaff"
                    v-model="awaitingTransferOnly"
                    :label="t('orders-list-page.filter-awaiting-transfer')"
                    data-test="filter-awaiting-transfer"
                    hide-details
                    class="mt-2"
                />
                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary" data-test="search-submit">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" data-test="search-reset" @click="handleReset">
                        {{ t('generic.reset') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <InlineErrorAlert
            :message="rowActionError"
            class="mb-4"
            data-test="orders-list-row-action-error"
        />

        <v-empty-state v-if="ordersList.length === 0" :title="t('orders-list-page.empty-orders')">
            <template #actions>
                <v-btn color="primary" :to="routerLinkI18n({ name: 'Cart' })">
                    {{ t('orders-list-page.button-go-to-cart') }}
                </v-btn>
            </template>
        </v-empty-state>

        <DataTable
            v-else
            v-model="selectedOrderId"
            v-model:sort-by="sortBy"
            :server-sort-keys="sortableKeys"
            :headers="tableHeaders"
            :items="pageItemList"
            :caption="t('orders-list-page.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <!-- The number is what mails and invoices cite; the id stays the fallback, and the link's
                 own address, for an order that has none. -->
            <template v-slot:[`item.id`]="{ item }">
                <span data-test="row-order-number">{{ item.orderNumber ?? item.id }}</span>
            </template>

            <template v-slot:[`item.status`]="{ item }">
                <v-chip size="small" variant="tonal" :color="statusColor(item.status)">
                    {{ t(`orders-form.status-${item.status}`) }}
                </v-chip>
                <v-chip
                    v-if="item.deletedAt"
                    size="small"
                    variant="tonal"
                    color="warning"
                    class="ml-1"
                    data-test="row-deleted"
                >
                    {{ t('generic.deleted') }}
                </v-chip>
            </template>

            <template v-slot:[`item.totalPrice`]="{ item }">
                {{ formatCurrency(item.totalPrice, item.currency ?? shopCurrency) }}
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
                        :aria-label="t('orders-list-page.button-view-named', { id: item.id })"
                        :to="routerLinkI18n({ name: 'OrderTarget', params: { id: item.id } })"
                    >
                        {{ t('orders-list-page.button-view') }}
                    </v-btn>
                    <v-btn
                        v-if="session.can('update', 'Order')"
                        :size="rowActionSize"
                        variant="tonal"
                        color="secondary"
                        data-test="row-edit"
                        :aria-label="t('orders-list-page.button-edit-named', { id: item.id })"
                        :to="routerLinkI18n({ name: 'OrderEdit', params: { id: item.id } })"
                    >
                        {{ t('orders-list-page.button-edit') }}
                    </v-btn>
                    <v-btn
                        v-if="session.can('delete', 'Order') && item.deletedAt"
                        :size="rowActionSize"
                        variant="tonal"
                        color="success"
                        data-test="row-restore"
                        :aria-label="t('orders-list-page.button-restore-named', { id: item.id })"
                        :disabled="loading"
                        @click.stop="handleRestore(item.id)"
                    >
                        {{ t('orders-list-page.button-restore') }}
                    </v-btn>
                    <v-btn
                        v-else-if="session.can('delete', 'Order')"
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-delete"
                        :aria-label="t('orders-list-page.button-delete-named', { id: item.id })"
                        :disabled="loading"
                        @click.stop="handleDelete(item.id)"
                    >
                        {{ t('orders-list-page.button-delete') }}
                    </v-btn>
                    <v-btn
                        v-if="session.can('delete', 'Order')"
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-hard-delete"
                        :aria-label="
                            t('orders-list-page.button-hard-delete-named', { id: item.id })
                        "
                        :disabled="loading"
                        @click.stop="handleHardDelete(item.id)"
                    >
                        {{ t('orders-list-page.button-hard-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </div>
</template>
