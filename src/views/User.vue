<template>
    <LayoutDefault id="user-target">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('user-target-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card animate-on-hover">
            <div class="card-content">
                <div v-if="currentUser" class="user-details">
                    <table class="user-detail-table">
                        <tbody>
                            <tr>
                                <th>{{ t('user-target-page.label-id') }}</th>
                                <td>{{ currentUser.id }}</td>
                            </tr>
                            <tr>
                                <th>{{ t('user-target-page.label-username') }}</th>
                                <td>{{ currentUser.username }}</td>
                            </tr>
                            <tr>
                                <th>{{ t('user-target-page.label-email') }}</th>
                                <td>{{ currentUser.email }}</td>
                            </tr>
                            <tr>
                                <th>{{ t('user-target-page.label-admin') }}</th>
                                <td>{{ currentUser.admin ? '✓' : '✗' }}</td>
                            </tr>
                            <tr>
                                <th>{{ t('user-target-page.label-active') }}</th>
                                <td>{{ currentUser.active ? '✓' : '✗' }}</td>
                            </tr>
                            <tr v-if="currentUser.createdAt">
                                <th>{{ t('user-target-page.label-created-at') }}</th>
                                <td>{{ new Date(currentUser.createdAt).toLocaleString() }}</td>
                            </tr>
                            <tr v-if="currentUser.updatedAt">
                                <th>{{ t('user-target-page.label-updated-at') }}</th>
                                <td>{{ new Date(currentUser.updatedAt).toLocaleString() }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="user-target-actions">
            <RouterLink
                v-if="currentUser"
                :to="routerLinkI18n({ name: 'UserEdit', params: { id: currentUser.id } })"
            >
                {{ t('user-target-page.button-go-to-edit') }}
            </RouterLink>
            <RouterLink
                :to="routerLinkI18n({ name: 'UsersList' })"
            >
                {{ t('user-target-page.button-go-to-list') }}
            </RouterLink>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UserTargetPage'
};
</script>

<script setup lang="ts">
import { onBeforeMount, defineProps } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useUsersStore } from '@/stores/users';

import LayoutDefault from '@/layouts/LayoutDefault.vue';

/**
 * Generics
 */
const { t } = useI18n();
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Users store
 * The composable within will have most of the logic for this kind of pages
 */
const { fetchUser } = useUsersStore();
const { currentUser, selectedUserId } = storeToRefs(useUsersStore());

/**
 * Get user from API
 */
onBeforeMount(() => {
    if (!id) return;
    // Select the current user id so selectedRecord/currentUser
    // will be populated when data is available
    selectedUserId.value = id;
    return fetchUser(id);
});
</script>

<style lang="scss">
#user-target {
    .user-detail-table {
        width: 100%;
        border-collapse: collapse;

        th,
        td {
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid rgba(128, 128, 128, 0.2);
        }

        th {
            width: 40%;
            font-weight: 600;
            color: rgba(128, 128, 128, 0.8);
        }
    }

    .user-target-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
    }
}
</style>
