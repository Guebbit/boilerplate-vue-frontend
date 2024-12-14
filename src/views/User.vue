<template>
    <div>
        <h1>UTENTE TARGET || {{ id }}. Loading: {{ loading }}</h1>
        TODO: tipica pagina che carica un singolo utenate (fare pinia, TTL, etc)
        + info utente
        + sanitizzazione

        <div class="theme-card animate-on-hover">
            <div class="card-content">
                <pre>{{ selectedRecord }}</pre>
            </div>
        </div>


        <div class="simple-card">
            <input type="file" id="fileInput" />
            <button class="simple-button" @click="uploadImage">Upload Image</button>
        </div>


        <RouterLink
            :to="routerLinkI18n({
                name: 'UserList',
            })"
        >
            {{ t('TODO.gotoList') }}
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
import { useItemStructure } from '@/composables/itemStructure.ts'
import type { IUser } from '@/types'
import { putProfileImage } from '@/api'


function uploadImage() {
    const { files } = document.getElementById('fileInput') as HTMLInputElement
    if (!files || files.length < 1)
        return;
    const formData = new FormData()
    formData.append('file', files[0])

    // TODO upload
    putProfileImage(formData, ({ progress = 0 }) => {
        console.log("upload %", Math.round(progress * 100) + '%');
    })
}


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
    selectedRecord
} = useItemStructure<IUser>()

/**
 * Get user from API
 */
onBeforeMount(() => {
    if (!id)
        return
    // I need this user data.
    // selectedRecord will be populated when data is available
    selectedIdentifier.value = id
    startLoading()
    fetchUser(id)
        .then(() => itemList.value = usersList.value)
        .finally(stopLoading)
})
</script>
