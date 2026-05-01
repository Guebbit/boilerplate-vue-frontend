<script lang="ts">
export default {
    name: 'UsersListPage'
};
</script>

<script setup lang="ts">
import '@/styles/pages/usersList.scss';
import { computed, onMounted, reactive, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/stores/users';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';
import type { SearchUsersRequest } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import CoreDataTable from '@/components/molecules/CoreDataTable.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { fetchSearchUsers, deleteUser } = useUsersStore();
const { pageItemList, selectedUserId, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useUsersStore());

pageSize.value = 10;

const filters = reactive<Omit<SearchUsersRequest, 'page' | 'pageSize'>>({});

const activeOptions = [
    { value: undefined, label: t('users-list-page.filter-active-all') },
    { value: true, label: t('users-list-page.filter-active-yes') },
    { value: false, label: t('users-list-page.filter-active-no') }
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

const handleSearch = () => {
    pageCurrent.value = 1;
    fetchSearchUsers(filters, 1, pageSize.value).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
};

const handleReset = () => {
    for (const k of Object.keys(filters)) delete (filters as Record<string, unknown>)[k];
    pageCurrent.value = 1;
    fetchSearchUsers({}, 1, pageSize.value, true).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
};

const handleDelete = (userId: string) => {
    if (!confirm(t('users-list-page.confirm-delete'))) return;
    deleteUser(userId)
        .then(() => addMessage(t('users-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : '-');

onMounted(() =>
    fetchSearchUsers(filters, Math.max(1, pageCurrent.value), pageSize.value).catch((error) =>
        notifyErrorMessages(addMessage, error)
    )
);

watch([pageCurrent, pageSize], ([currentPage, currentPageSize]) => {
    fetchSearchUsers(filters, Math.max(1, currentPage), currentPageSize).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
});
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

        <CoreDataTable
            v-model="selectedUserId"
            :headers="tableHeaders"
            :items="pageItemList"
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
        </CoreDataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>
