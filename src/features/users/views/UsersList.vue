<script lang="ts">
export default {
    name: 'UsersListPage'
};
</script>

<script setup lang="ts">
import '@/styles/features/users.scss';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/features/users/store';
import { notifyErrorMessages } from '@/utils/errors.ts';
import type { User } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import DataTable from '@/components/organisms/DataTable.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { watchSearchUsers, deleteUser } = useUsersStore();
const { filters, pageItemList, selectedUserId, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useUsersStore());

const activeOptions = [
    { value: undefined, label: t('users-list-page.filter-active-all') },
    { value: true, label: t('users-list-page.filter-active-yes') },
    { value: false, label: t('users-list-page.filter-active-no') }
];
const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' }
];

const tableHeaders = computed(() => [
    { title: t('users-list-page.column-id'), key: 'id' },
    { title: t('users-list-page.column-username'), key: 'username' },
    { title: t('users-list-page.column-email'), key: 'email' },
    { title: t('users-list-page.column-admin'), key: 'admin' },
    { title: t('users-list-page.column-active'), key: 'active' },
    { title: t('users-list-page.column-created-at'), key: 'createdAt' },
    { title: t('users-list-page.column-actions'), key: 'actions' }
]);

const pageItems = computed(() => pageItemList.value.filter((item): item is User => !!item));

const { search } = watchSearchUsers((error) => notifyErrorMessages(addMessage, error));

const handleSearch = () => {
    pageCurrent.value = 1;
    return search();
};

const handleReset = () => {
    filters.value = {};
    pageCurrent.value = 1;
    return search(true);
};

const handleDelete = (userId: string) => {
    if (!confirm(t('users-list-page.confirm-delete'))) return;
    deleteUser(userId)
        .then(() => addMessage(t('users-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : '-');
</script>

<template>
    <LayoutDefault id="users-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('users-list-page.page-title') }}</span>
            </h1>
        </template>

        <form class="list-filters" @submit.prevent="handleSearch">
            <BaseInput
                v-model="filters.text"
                :label="t('users-list-page.filter-text')"
                :placeholder="t('users-list-page.filter-text')"
            />
            <BaseInput
                v-model="filters.id"
                :label="t('users-list-page.filter-id')"
                :placeholder="t('users-list-page.filter-id')"
            />
            <BaseInput
                v-model="filters.email"
                :label="t('users-list-page.filter-email')"
                :placeholder="t('users-list-page.filter-email')"
            />
            <BaseInput
                v-model="filters.username"
                :label="t('users-list-page.filter-username')"
                :placeholder="t('users-list-page.filter-username')"
            />
            <BaseSelect
                v-model="filters.active"
                :label="t('users-list-page.filter-active')"
                :options="activeOptions"
            />
            <BaseSelect
                v-model="pageSize"
                :label="t('generic.page-size')"
                :options="pageSizeOptions"
            />
            <div class="list-filters-actions">
                <button type="submit" class="theme-button">{{ t('generic.search') }}</button>
                <button type="button" class="theme-button" @click="handleReset">
                    {{ t('generic.reset') }}
                </button>
            </div>
        </form>

        <div class="users-list-actions">
            <RouterLink :to="routerLinkI18n({ name: 'UserCreate' })" class="theme-button">
                {{ t('users-list-page.button-create-user') }}
            </RouterLink>
        </div>

        <DataTable
            v-model="selectedUserId"
            :headers="tableHeaders"
            :items="pageItems"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template v-slot:[`item.admin`]="{ item }">
                {{ item.admin ? '✓' : '✗' }}
            </template>

            <template v-slot:[`item.active`]="{ item }">
                {{ item.active ? '✓' : '✗' }}
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="actions-cell">
                    <RouterLink
                        :to="routerLinkI18n({ name: 'UserTarget', params: { id: item.id } })"
                        class="theme-button view-button"
                    >
                        {{ t('users-list-page.button-view') }}
                    </RouterLink>
                    <RouterLink
                        :to="routerLinkI18n({ name: 'UserEdit', params: { id: item.id } })"
                        class="theme-button edit-button"
                    >
                        {{ t('users-list-page.button-edit') }}
                    </RouterLink>
                    <button
                        class="theme-button delete-button"
                        :disabled="loading"
                        @click.stop="handleDelete(item.id!)"
                    >
                        {{ t('users-list-page.button-delete') }}
                    </button>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>
