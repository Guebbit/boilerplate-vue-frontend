<template>
    <div id="user-list-page" class="item-list-page">
        <h1 class="theme-page-title"><span>LISTA UTENTI</span></h1>
        <div>
            TODO: tipica pagina che carica la lista utenti (fare pinia, TTL, etc) + lista cliccabile
            TODO i colori da HEX a RGB così vai le variazioni di opacità
        </div>


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

        <div class="user-list">
            <div
                v-for="user in list"
                :key="'user-card-' + user.id"
                class="theme-card animate-on-active animate-on-hover card-boxshadowless"
                :class="{
                    active: selectedIdentifier === user.id
                }"
                @click="selectedIdentifier = user.id"
            >
                <img
                    class="card-image"
                    :alt="user.name + ' photo'"
                    :src="'https://placehold.co/' + (Math.floor((user.id || 1) % 10) + 5).toString() + '00x' + (Math.floor((user.id || 1) % 10) + 5).toString() + '00'"
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
                        {{ t('page-list-users.button-go-to-details') }}
                    </RouterLink>
                </div>
            </div>
        </div>

        <ListPagination
            v-model="pageCurrent"
            :length="pageTotal"
        />
    </div>
</template>

<script setup lang="ts">
// TODO creare Composables per riutilizzare questo genere di pagina "lista X"
// TODO creare file SCSS per questa specifica pagina (tipo tema) e poi fare customizzazioni
// TODO Guardare vrmetacarpi pagine simili
// (fare anche per User.vue)

import { onBeforeMount } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getUserList } from '@/api'
import useItemList, { type ISortOrder } from '@/composables/useItemList'
import ListPagination from '@/components/molecules/ListPagination.vue'
import { routerLinkI18n } from '@/plugins/i18n'
import type { IUser } from '@/types'

/**
 * Generics
 */
const { t } = useI18n()

/**
 * Item List composable
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
onBeforeMount(() => {
    startLoading();
    getUserList()
        .then((data) => itemList.value = data)
        .finally(stopLoading)
})

/**
 * Filters and sorters
 * TODO decidere gerarchia, logical gates, etc
 */
filters.value.name = "";
sorters.value = {
    name: '',
} as Record<keyof IUser, ISortOrder>
</script>

<style lang="scss">
@use "@/assets/styles/pages/itemList";

#user-list-page {
    .user-list {
        --list-margin: 16px;
        --list-border-radius: 24px;

        .theme-card {
            --border-radius: 0;
            --background: transparent;
            --text-color: rgb(var(--core-white));
            --background-active: rgb(var(--primary-500), 0.5);
            --text-color-active: rgb(var(--on-primary-500));
            width: 100%;
            flex-direction: row;
            border-bottom: 2px solid var(--primary-700);
            cursor: pointer;

            .card-image {
                width: 30%;
                max-height: 100px;
                margin: var(--list-margin);
                border-radius: var(--list-border-radius);
            }

            .card-title {
                margin: 0;
            }

            &:first-child {
                border-top-left-radius: var(--list-border-radius);
                border-top-right-radius: var(--list-border-radius);
            }

            &:last-child {
                border-bottom: none;
                border-bottom-left-radius: var(--list-border-radius);
                border-bottom-right-radius: var(--list-border-radius);
            }
        }
    }

    .list-pagination {
        margin: 24px auto;
    }
}
</style>