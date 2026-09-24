<script lang="ts">
export default {
    name: 'UsersListPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Users list/search page. Wires the store's paginated search to a filter
 * form and a `DataTable`, with per-row view/edit/delete/hard-delete actions.
 */
import { computed } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Search, UserPlus } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/modules/users/store';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDate } from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import type { User } from '@types';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import LazyImage from '@/ui/molecules/LazyImage.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useDeletedFilterOptions } from '@/ui/composables/use-deleted-filter-options.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Users store actions.
 */
const { watchSearchUsers, deleteUser, hardDeleteUser, restoreUser } = useUsersStore();

/**
 * Users store reactive state — filters, the current page window and the pagination counters.
 */
const { filters, pageItemList, selectedUserId, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useUsersStore());

/**
 * Row-action button size: `small` on desktop, Vuetify's bigger default below `sm`, where a tap
 * replaces a click and `small` misses the WCAG touch-target recommendation.
 */
const rowActionSize = useTouchFriendlySize();

/**
 * Options of the "Deleted" filter select.
 */
const deletedOptions = useDeletedFilterOptions();

/**
 * Options of the "active" filter select.
 *
 * @returns The localized options, re-translated on locale change.
 */
const activeOptions = computed(() => [
    { value: undefined, label: t('users-list-page.filter-active-all') },
    { value: true, label: t('users-list-page.filter-active-yes') },
    { value: false, label: t('users-list-page.filter-active-no') }
]);

/**
 * Selectable page sizes for the users table.
 */
const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' }
];

/**
 * Columns of the users table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed<CoreDataTableHeader<User>[]>(() => [
    /*
     * `synthetic` although `imageUrl` IS a field: the cell renders the picture, not the string,
     * and a sortable column of URLs is a control that offers an ordering nobody wants.
     */
    { title: t('users-list-page.column-image'), key: 'image', synthetic: true, width: '72px' },
    { title: t('users-list-page.column-id'), key: 'id' },
    { title: t('users-list-page.column-username'), key: 'username' },
    { title: t('users-list-page.column-email'), key: 'email' },
    { title: t('users-list-page.column-role'), key: 'role' },
    { title: t('users-list-page.column-active'), key: 'active' },
    { title: t('users-list-page.column-created-at'), key: 'createdAt' },
    // Reads no field on the row: the cell is the `item.actions` slot below.
    { title: t('users-list-page.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * Search function bound to the store's reactive `filters`/pagination, reporting
 * a failed request as a toast.
 */
const { search } = watchSearchUsers({ onError: (error) => notifyErrorMessages(addMessage, error) });

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
 * Deletes a user after an explicit confirmation.
 *
 * @param userId - Identifier of the user to delete.
 * @returns A promise settling once the viewer has answered and, if they accepted, the
 *  delete has finished; a failure blocks the list in place ({@link rowActionError}).
 */
const handleDelete = (userId: string) =>
    useDialogStore()
        .confirm({ message: t('users-list-page.confirm-delete'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            clearRowActionError();
            return deleteUser(userId)
                .then(() => addMessage(t('users-list-page.success-delete')))
                .catch((error: unknown) => reportRowActionError(error));
        });

/**
 * Undoes a soft delete. No confirmation: nothing is lost by it, and a mistaken restore is one
 * delete away. The list is reloaded afterwards, since the active filter may no longer match.
 *
 * @param userId - Identifier of the user to restore.
 * @returns A promise settling once the restore and the reload have finished; a failure blocks the
 *  list in place ({@link rowActionError}).
 */
const handleRestore = (userId: string) => {
    clearRowActionError();
    return restoreUser(userId)
        .then(() => addMessage(t('users-list-page.success-restore')))
        .then(() => search(true))
        .catch((error: unknown) => reportRowActionError(error));
};

/**
 * Permanently deletes a user after an explicit confirmation. Unlike {@link handleDelete}, this
 * bypasses the soft-delete and cannot be undone.
 *
 * @param userId - Identifier of the user to hard-delete.
 * @returns A promise settling once the viewer has answered and, if they accepted, the
 *  hard-delete has finished; a failure blocks the list in place ({@link rowActionError}).
 */
const handleHardDelete = (userId: string) =>
    useDialogStore()
        .confirm({ message: t('users-list-page.confirm-hard-delete'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            clearRowActionError();
            return hardDeleteUser(userId)
                .then(() => addMessage(t('users-list-page.success-hard-delete')))
                .catch((error: unknown) => reportRowActionError(error));
        });
</script>

<template>
    <LayoutDefault id="users-list-page" :title="t('users-list-page.page-title')">
        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <v-text-field
                        v-model="filters.text"
                        :label="t('users-list-page.filter-text')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.id"
                        :label="t('users-list-page.filter-id')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.email"
                        :label="t('users-list-page.filter-email')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.username"
                        :label="t('users-list-page.filter-username')"
                        hide-details
                    />
                    <v-select
                        v-model="filters.active"
                        :label="t('users-list-page.filter-active')"
                        :items="activeOptions"
                        item-title="label"
                        item-value="value"
                        hide-details
                    />
                    <v-select
                        v-model="filters.deleted"
                        :label="t('generic.filter-deleted')"
                        :items="deletedOptions"
                        item-title="label"
                        item-value="value"
                        data-test="filter-deleted"
                        hide-details
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
                    <v-btn color="secondary" :to="routerLinkI18n({ name: 'UserCreate' })">
                        <UserPlus :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('users-list-page.button-create-user') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <InlineErrorAlert
            :message="rowActionError"
            class="mb-4"
            test-id="users-list-row-action-error"
        />

        <DataTable
            v-model="selectedUserId"
            :headers="tableHeaders"
            :items="pageItemList"
            :caption="t('users-list-page.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template v-slot:[`item.image`]="{ item }">
                <LazyImage
                    :src="item.imageUrl"
                    :thumbnail-src="item.thumbnailUrl"
                    :alt="t('users-list-page.image-alt', { name: item.username })"
                    :width="56"
                    :height="56"
                    rounded="rounded-full"
                />
            </template>

            <template v-slot:[`item.role`]="{ item }">
                <v-chip v-if="item.role" size="small" variant="tonal" color="tertiary">
                    {{ item.role }}
                </v-chip>
                <span v-else class="opacity-60">—</span>
            </template>

            <template v-slot:[`item.active`]="{ item }">
                <v-chip size="small" variant="tonal" :color="item.active ? 'success' : 'error'">
                    {{ item.active ? t('generic.enabled') : t('generic.disabled') }}
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

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="flex flex-wrap gap-1">
                    <v-btn
                        :size="rowActionSize"
                        variant="tonal"
                        data-test="row-view"
                        :aria-label="
                            t('users-list-page.button-view-named', { name: item.username })
                        "
                        :to="routerLinkI18n({ name: 'UserTarget', params: { id: item.id } })"
                    >
                        {{ t('users-list-page.button-view') }}
                    </v-btn>
                    <v-btn
                        :size="rowActionSize"
                        variant="tonal"
                        color="secondary"
                        data-test="row-edit"
                        :aria-label="
                            t('users-list-page.button-edit-named', { name: item.username })
                        "
                        :to="routerLinkI18n({ name: 'UserEdit', params: { id: item.id } })"
                    >
                        {{ t('users-list-page.button-edit') }}
                    </v-btn>
                    <v-btn
                        v-if="item.deletedAt"
                        :size="rowActionSize"
                        variant="tonal"
                        color="success"
                        data-test="row-restore"
                        :aria-label="
                            t('users-list-page.button-restore-named', { name: item.username })
                        "
                        :disabled="loading"
                        @click.stop="handleRestore(item.id!)"
                    >
                        {{ t('users-list-page.button-restore') }}
                    </v-btn>
                    <v-btn
                        v-else
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-delete"
                        :aria-label="
                            t('users-list-page.button-delete-named', { name: item.username })
                        "
                        :disabled="loading"
                        @click.stop="handleDelete(item.id!)"
                    >
                        {{ t('users-list-page.button-delete') }}
                    </v-btn>
                    <v-btn
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-hard-delete"
                        :aria-label="
                            t('users-list-page.button-hard-delete-named', { name: item.username })
                        "
                        :disabled="loading"
                        @click.stop="handleHardDelete(item.id!)"
                    >
                        {{ t('users-list-page.button-hard-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>
