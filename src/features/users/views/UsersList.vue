<script lang="ts">
export default {
    name: 'UsersListPage'
};
</script>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/features/users/store';
import { notifyErrorMessages } from '@/utils/errors.ts';
import type { SearchUsersRequest } from '@types';
import { VBtn, VCard, VCardText, VChip, VCol, VIcon, VRow } from 'vuetify/components';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import DataTable from '@/components/organisms/DataTable.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';
import { useListPage } from '@/composables/useListPage.ts';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { fetchSearchUsers, deleteUser } = useUsersStore();
const { pageItemList, selectedUserId, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useUsersStore());

const filters = reactive<Omit<SearchUsersRequest, 'page' | 'pageSize'>>({});

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

const { handleSearch, handleReset } = useListPage({
    filters,
    pageCurrent,
    pageSize,
    fetchSearch: fetchSearchUsers,
    onError: (error) => notifyErrorMessages(addMessage, error)
});

const handleDelete = (userId: string) => {
    if (!confirm(t('users-list-page.confirm-delete'))) return;
    deleteUser(userId)
        .then(() => addMessage(t('users-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : '-');
</script>

<template>
    <LayoutDefault id="users-list-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('users-list-page.page-title') }}</span>
            </h1>
        </template>

        <VCard class="mb-6" rounded="lg" variant="outlined">
            <VCardText>
                <form @submit.prevent="handleSearch">
                    <VRow dense>
                        <VCol cols="12" md="4">
                            <BaseInput
                                v-model="filters.text"
                                :label="t('users-list-page.filter-text')"
                                :placeholder="t('users-list-page.filter-text')"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <BaseInput
                                v-model="filters.id"
                                :label="t('users-list-page.filter-id')"
                                :placeholder="t('users-list-page.filter-id')"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <BaseInput
                                v-model="filters.email"
                                :label="t('users-list-page.filter-email')"
                                :placeholder="t('users-list-page.filter-email')"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <BaseInput
                                v-model="filters.username"
                                :label="t('users-list-page.filter-username')"
                                :placeholder="t('users-list-page.filter-username')"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <BaseSelect
                                v-model="filters.active"
                                :label="t('users-list-page.filter-active')"
                                :options="activeOptions"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <BaseSelect
                                v-model="pageSize"
                                :label="t('generic.page-size')"
                                :options="pageSizeOptions"
                            />
                        </VCol>
                        <VCol cols="12" class="d-flex flex-wrap ga-3 justify-end">
                            <VBtn type="submit" color="primary">
                                <VIcon icon="$search" start />
                                {{ t('generic.search') }}
                            </VBtn>
                            <VBtn type="button" variant="tonal" @click="handleReset">
                                {{ t('generic.reset') }}
                            </VBtn>
                        </VCol>
                    </VRow>
                </form>
            </VCardText>
        </VCard>

        <div class="d-flex justify-end mb-4">
            <VBtn :to="routerLinkI18n({ name: 'UserCreate' })" color="primary">
                <VIcon icon="$accountPlus" start />
                {{ t('users-list-page.button-create-user') }}
            </VBtn>
        </div>

        <DataTable
            v-model="selectedUserId"
            :headers="tableHeaders"
            :items="pageItemList"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template v-slot:[`item.admin`]="{ item }">
                <VChip :color="item.admin ? 'success' : 'default'" size="small" variant="tonal">
                    {{ item.admin ? '✓' : '✗' }}
                </VChip>
            </template>

            <template v-slot:[`item.active`]="{ item }">
                <VChip :color="item.active ? 'success' : 'warning'" size="small" variant="tonal">
                    {{ item.active ? '✓' : '✗' }}
                </VChip>
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="d-flex flex-wrap ga-2">
                    <VBtn
                        :to="routerLinkI18n({ name: 'UserTarget', params: { id: item.id } })"
                        class="view-button"
                        color="primary"
                        size="small"
                        variant="tonal"
                    >
                        <VIcon icon="$eye" start />
                        {{ t('users-list-page.button-view') }}
                    </VBtn>
                    <VBtn
                        :to="routerLinkI18n({ name: 'UserEdit', params: { id: item.id } })"
                        class="edit-button"
                        color="secondary"
                        size="small"
                        variant="tonal"
                    >
                        <VIcon icon="$pencil" start />
                        {{ t('users-list-page.button-edit') }}
                    </VBtn>
                    <VBtn
                        class="delete-button"
                        color="error"
                        size="small"
                        variant="tonal"
                        :disabled="loading"
                        @click.stop="handleDelete(item.id!)"
                    >
                        <VIcon icon="$delete" start />
                        {{ t('users-list-page.button-delete') }}
                    </VBtn>
                </div>
            </template>
        </DataTable>

        <div class="mt-4">
            <ListPagination v-model="pageCurrent" :length="pageTotal" />
        </div>
    </LayoutDefault>
</template>
