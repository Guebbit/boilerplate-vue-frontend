<script setup lang="ts">
import '../assets/styles/pages/usersList.scss';
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useUsersStore } from '@/stores/users';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';

/**
 * Generics
 */
const { t } = useI18n();

/**
 * Users store
 * useStructureRestApi within the store handles data management,
 * selection, loading state and pagination
 */
const { fetchUsers } = useUsersStore();
const {
    pageItemList,
    selectedUserId,
    currentUser,
    pageCurrent,
    pageSize,
    pageTotal
} = storeToRefs(useUsersStore());

/**
 * Initialize pagination
 */
pageSize.value = 6;

/**
 * Get users from API
 */
onMounted(fetchUsers);
</script>

<template>
    <LayoutDefault id="users-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('users-list-page.page-title') }}</span>
            </h1>
        </template>

        <div class="users-list">
            <div
                v-for="user in pageItemList"
                :key="'user-card-' + user.id"
                class="theme-card"
                :class="{
                    active: selectedUserId === user.id
                }"
                @click="selectedUserId = user.id"
            >
                <img class="card-image" :alt="user.username + ' photo'" :src="user.imageUrl" />
                <div class="card-content">
                    <h2 class="card-title">
                        <b>{{ user.id }}</b> {{ user.username }}
                    </h2>
                    <p>{{ user.email }}</p>
                    <RouterLink
                        :to="
                            routerLinkI18n({
                                name: 'UserTarget',
                                params: {
                                    id: user.id
                                }
                            })
                        "
                    >
                        {{ t('users-list-page.button-go-to-details') }}
                    </RouterLink>
                </div>
            </div>
        </div>

        <ListPagination
            v-model="pageCurrent"
            :length="pageTotal"
        />

        <div v-show="selectedUserId && currentUser">
            <h3>SELECTED</h3>
            <pre>{{ currentUser }}</pre>
            <RouterLink
                v-if="currentUser"
                :to="routerLinkI18n({
                    name: 'UserTarget',
                    params: {
                        id: currentUser.id
                    }
                })"
            >
                GOTO DETAILS
            </RouterLink>
        </div>
    </LayoutDefault>
</template>