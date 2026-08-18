<script lang="ts">
export default {
    name: 'UsersListPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/routerLink.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Search, UserPlus } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/modules/users/store';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDate } from '@/infrastructure/utils/formatters.ts';
import type { User } from '@types';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import DataTable from '@/ui/organisms/DataTable.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { watchSearchUsers, deleteUser } = useUsersStore();
const { filters, pageItemList, selectedUserId, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useUsersStore());

/**
 * Options of the "active" filter select.
 */
const activeOptions = [
    { value: undefined, label: t('users-list-page.filter-active-all') },
    { value: true, label: t('users-list-page.filter-active-yes') },
    { value: false, label: t('users-list-page.filter-active-no') }
];
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
const tableHeaders = computed(() => [
    { title: t('users-list-page.column-id'), key: 'id' },
    { title: t('users-list-page.column-username'), key: 'username' },
    { title: t('users-list-page.column-email'), key: 'email' },
    { title: t('users-list-page.column-admin'), key: 'admin' },
    { title: t('users-list-page.column-active'), key: 'active' },
    { title: t('users-list-page.column-created-at'), key: 'createdAt' },
    { title: t('users-list-page.column-actions'), key: 'actions' }
]);

/**
 * Rows of the current page.
 *
 * @returns The page's users, with the placeholder holes of the sparse pagination
 *  list filtered out.
 */
const pageItems = computed(() => pageItemList.value.filter((item): item is User => !!item));

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
 * Deletes a user after an explicit confirmation.
 *
 * @param userId - Identifier of the user to delete.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleDelete = (userId: string) => {
    if (!confirm(t('users-list-page.confirm-delete'))) return;
    deleteUser(userId)
        .then(() => addMessage(t('users-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};
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

        <DataTable
            v-model="selectedUserId"
            :headers="tableHeaders"
            :items="pageItems"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template v-slot:[`item.admin`]="{ item }">
                <v-chip v-if="item.admin" size="small" variant="tonal" color="tertiary">
                    {{ t('generic.administrator') }}
                </v-chip>
                <span v-else class="opacity-60">—</span>
            </template>

            <template v-slot:[`item.active`]="{ item }">
                <v-chip size="small" variant="tonal" :color="item.active ? 'success' : 'error'">
                    {{ item.active ? t('generic.enabled') : t('generic.disabled') }}
                </v-chip>
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="flex flex-wrap gap-1">
                    <v-btn
                        size="small"
                        variant="tonal"
                        data-test="row-view"
                        :to="routerLinkI18n({ name: 'UserTarget', params: { id: item.id } })"
                    >
                        {{ t('users-list-page.button-view') }}
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="tonal"
                        color="secondary"
                        data-test="row-edit"
                        :to="routerLinkI18n({ name: 'UserEdit', params: { id: item.id } })"
                    >
                        {{ t('users-list-page.button-edit') }}
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="tonal"
                        color="error"
                        data-test="row-delete"
                        :disabled="loading"
                        @click.stop="handleDelete(item.id!)"
                    >
                        {{ t('users-list-page.button-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>
