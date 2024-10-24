<template>
    <div>
        <h1>UTENTE TARGET || {{id}}. Loading: {{ loading }}</h1>
        TODO: tipica pagina che carica un singolo utente (fare pinia, TTL, etc)
        + info utente
        + sanitizzazione

        <div class="theme-card animate-on-hover">
            <div class="card-content">
                <pre>{{ selectedRecord }}</pre>
            </div>
        </div>

        <RouterLink
            :to="routerLinkI18n({
                name: 'UserList',
            })"
        >
            GOBACK
        </RouterLink>
    </div>
</template>

<script setup lang="ts">
import { onBeforeMount, defineProps } from 'vue'
import { RouterLink } from 'vue-router'
import { routerLinkI18n } from '@/plugins/i18n'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUsersStore } from '@/stores/users'
import { useItemStructure } from '@/composables/useItemStructure'

import type { IUser } from '@/types'

/**
 * Generics
 */
const { t } = useI18n()
const { id } = defineProps<{
    id?: string
}>()

/**
 * Users store
 */
const {
    fetchUser
} = useUsersStore()
const {
    usersList
} = storeToRefs(useUsersStore())

/**
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
} = useItemStructure<IUser>()

/**
 * Get user from API
 */
onBeforeMount(() => {
    if(!id)
        return;
    // I need this user data.
    // selectedRecord will be populated when data is available
    selectedIdentifier.value = id;
    startLoading()
    fetchUser(id)
        .then(() => itemList.value = usersList.value)
        .finally(stopLoading)
})
</script>
