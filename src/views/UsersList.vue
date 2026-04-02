<script setup lang="ts">
import '../assets/styles/pages/usersList.scss';
import { onMounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/stores/users';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';

/**
 * Generics
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Users store
 * useStructureRestApi within the store handles data management,
 * selection, loading state and pagination
 */
const { fetchPaginationUsers, deleteUser } = useUsersStore();
const {
    pageItemList,
    selectedUserId,
    pageCurrent,
    pageSize,
    pageTotal,
    loading
} = storeToRefs(useUsersStore());

/**
 * Initialize pagination
 */
pageSize.value = 10;

/**
 * Get users from API
 */
onMounted(() => fetchPaginationUsers(Math.max(1, pageCurrent.value), pageSize.value));

watch([pageCurrent, pageSize], ([currentPage, currentPageSize]) => {
    fetchPaginationUsers(Math.max(1, currentPage), currentPageSize);
});

/**
 * Delete a user after confirmation
 */
const handleDelete = (userId: string) => {
    if (!confirm(t('users-list-page.confirm-delete'))) return;
    deleteUser(userId)
        .then(() => addMessage(t('users-list-page.success-delete')))
        .catch(({ message }: { message: string }) => addMessage(message));
};
</script>

<template>
    <LayoutDefault id="users-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('users-list-page.page-title') }}</span>
            </h1>
        </template>

        <div class="users-list-actions">
            <RouterLink
                :to="routerLinkI18n({ name: 'UserCreate' })"
                class="theme-button"
            >
                {{ t('users-list-page.button-create-user') }}
            </RouterLink>
        </div>

        <div class="users-table-wrapper">
            <table class="users-table">
                <thead>
                    <tr>
                        <th>{{ t('users-list-page.column-id') }}</th>
                        <th>{{ t('users-list-page.column-username') }}</th>
                        <th>{{ t('users-list-page.column-email') }}</th>
                        <th>{{ t('users-list-page.column-admin') }}</th>
                        <th>{{ t('users-list-page.column-active') }}</th>
                        <th>{{ t('users-list-page.column-created-at') }}</th>
                        <th>{{ t('users-list-page.column-actions') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="user in pageItemList"
                        :key="'user-row-' + user.id"
                        :class="{ active: selectedUserId === user.id }"
                        @click="selectedUserId = user.id"
                    >
                        <td>{{ user.id }}</td>
                        <td>{{ user.username }}</td>
                        <td>{{ user.email }}</td>
                        <td>{{ user.admin ? '✓' : '✗' }}</td>
                        <td>{{ user.active ? '✓' : '✗' }}</td>
                        <td>{{ user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-' }}</td>
                        <td class="actions-cell">
                            <RouterLink
                                :to="routerLinkI18n({ name: 'UserTarget', params: { id: user.id } })"
                                class="theme-button"
                            >
                                {{ t('users-list-page.button-view') }}
                            </RouterLink>
                            <RouterLink
                                :to="routerLinkI18n({ name: 'UserEdit', params: { id: user.id } })"
                                class="theme-button"
                            >
                                {{ t('users-list-page.button-edit') }}
                            </RouterLink>
                            <button
                                class="theme-button"
                                :disabled="loading"
                                @click.stop="handleDelete(user.id!)"
                            >
                                {{ t('users-list-page.button-delete') }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <ListPagination
            v-model="pageCurrent"
            :length="pageTotal"
        />
    </LayoutDefault>
</template>
