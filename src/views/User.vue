<template>
    <LayoutDefault id="user-target">
        <template #header>
            <h1 class="theme-page-title"><span>{{ t('user-target-page.page-title') }}</span></h1>
        </template>

        <div class="theme-card animate-on-hover">
            <div class="card-content">
                <pre>{{ currentUser }}</pre>
            </div>
        </div>

        <RouterLink
            :to="routerLinkI18n({
                name: 'UsersList',
            })"
        >
            {{ t('user-target-page.button-go-to-list') }}
        </RouterLink>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UserTargetPage'
}
</script>

<script setup lang="ts">
import { onBeforeMount, defineProps } from 'vue'
import { RouterLink } from 'vue-router'
import { routerLinkI18n } from '@/utils/i18n.ts'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUsersStore } from '@/stores/users'

import LayoutDefault from '@/layouts/LayoutDefault.vue'

/**
 * Generics
 */
const { t } = useI18n()
const { id } = defineProps<{
    id?: string
}>()


/**
 * Users store
 * The composable within will have most of the logic for this kind of pages
 */
const {
    fetchUser
} = useUsersStore()
const {
    currentUser,
    selectedUserId
} = storeToRefs(useUsersStore())


/**
 * Get user from API
 */
onBeforeMount(() => {
    if (!id)
        return
    // Select the current user id so selectedRecord/currentUser
    // will be populated when data is available
    selectedUserId.value = id
    return fetchUser(id)
})
</script>