<template>
    <LayoutDefault id="users-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title"><span>{{ t('users-list-page.page-title') }}</span></h1>
        </template>

        <div class="users-list">
            <div
                v-for="user in usersList"
                :key="'user-card-' + user.id"
                class="theme-card"
                :class="{
                    active: selectedIdentifier === user.id
                }"
                @click="selectedIdentifier = user.id"
            >
                <img
                    class="card-image"
                    :alt="user.name + ' photo'"
                    :src="user.imageUrl"
                />
                <div class="card-content">
                    <h2 class="card-title"><b>{{ user.id }}</b> {{ user.name }}</h2>
                    <p>{{ user.phone }} - {{ user.email }} - {{ user.website }}</p>
                    <RouterLink
                        :to="routerLinkI18n({
                            name: 'UserTarget',
                            params: {
                                id: user.id,
                            }
                        })"
                    >
                        {{ t('users-list-page.button-go-to-details') }}
                    </RouterLink>
                </div>
            </div>
        </div>


        <!--
        <ListPagination
            v-model="pageCurrent"
            :length="pageTotal"
        />

        <h3>
            Loading: {{loading}} <br/>
            Total elements: {{ total }}
        </h3>

        <h1>FILTERS</h1>
        <input
            v-for="field in Object.keys(filters)"
            :key="'filter-' + field"
            v-model="filters[field as keyof typeof filters]"
            :placeholder="'search here ' + field"
        >

        <h1>SORTING</h1>
        <div
            v-for="field in Object.keys(sorters)"
            :key="'sorting-' + field"
        >
            <label :for="field">{{ field }}</label>
            <select
                :id="field"
                v-model="sorters[field as keyof typeof sorters]"
            >
                <option value="">None</option>
                <option value="ASC">Ascending</option>
                <option value="DESC">Descending</option>
            </select>
        </div>


        <div v-show="selectedIdentifier && selectedRecord">
            <h3>SELECTED</h3>
            <pre>{{ selectedRecord }}</pre>
            <RouterLink
                v-if="selectedRecord"
                :to="routerLinkI18n({
                    name: 'UserTarget',
                    params: {
                        id: selectedRecord.id
                    }
                })"
            >
                GOTO DETAILS
            </RouterLink>
        </div>

        <ListPagination
            v-model="pageCurrent"
            :length="pageTotal"
        />
        -->
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UsersListPage'
}
</script>

<script setup lang="ts">
import "../assets/styles/pages/usersList.scss";
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUsersStore } from '@/stores/users';
import { useItemList, type ISortOrder } from '@/composables/itemList.ts'

import LayoutDefault from '@/layouts/LayoutDefault.vue'
import ListPagination from '@/components/molecules/ListPagination.vue'

import type { IUser } from '@/types'

/**
 * Generics
 */
const { t } = useI18n()

/**
 * Users store
 * The composable within will have most of the logic for this kind of pages
 */
const {
    fetchUsers,
} = useUsersStore();
const {
    usersList,
} = storeToRefs(useUsersStore());

/**
 * TODO
 * Composable that will have most of the logic
 * of all this kind of pages
 */
const {
    startLoading,
    stopLoading,
    loading,
    itemList,
    selectedIdentifier,
    selectedRecord,
    pageCurrent,
    pageSize,
    pageTotal,
    filters,
    sorters,
    list,
    total
} = useItemList<IUser>()

/**
 * Initialize pagination
 */
pageSize.value = 6

/**
 * Get users from API
 */
onMounted(fetchUsers)

/**
 * Filters and sorters
 * TODO decidere gerarchia, logical gates, etc
 */
filters.value.name = "";
sorters.value = {
    name: '',
} as Record<keyof IUser, ISortOrder>
</script>

