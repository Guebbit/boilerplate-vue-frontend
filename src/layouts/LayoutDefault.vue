<script setup lang="ts">
import { useSlots } from 'vue';
import { storeToRefs } from 'pinia'
import LoadingCore from '@/components/atoms/LoadingCore.vue'
import LoadingSide from '@/components/atoms/LoadingSide.vue'
import Navigation from '@/components/organisms/Navigation.vue'
import { useCoreStore } from '@/stores/core'
import { useToastStore } from '@/stores/toasts'
import { useProfileStore } from '@/stores/profile.ts'

/**
 *
 */
defineProps<{
    /**
     * Id that I'll give to <main> tag
     */
    id?: string
}>()

/**
 * Slots
 * - default
 * - header
 * - navigation
 */
const slots = useSlots();

/**
 * core loading
 */
const {
    loadings,
    isLoading
} = storeToRefs(useCoreStore())

/**
 * Toasts
 */
const {
    messages
} = storeToRefs(useToastStore())
const {
    hideMessage
} = useToastStore()


/**
 * Profile
 */
const {
    profile
} = storeToRefs(useProfileStore())
const {
    fetchProfile
} = useProfileStore()

/**
 * Fetch current user profile (if logged in)
 */
fetchProfile()
</script>

<template>
    <Navigation>
        <slot name="navigation" />
        <h3 v-if="profile">Hello {{ profile.email }}</h3>
    </Navigation>

    <div v-if="slots.header">
        <slot name="header" />
    </div>

    <main :id class="page-content">
        <div
            v-show="messages.length > 0"
            class="toast-container"
        >
            <div
                v-for="alert in messages"
                :key="'alert-' + alert.id"
                v-show="alert.visible"
                class="theme-card"
            >
                {{ alert.message }}
                <button
                    class="theme-button"
                    @click="hideMessage(alert.id)"
                >X</button>
            </div>
        </div>

        <slot />
    </main>

    <transition name="loaders-fade">
        <LoadingCore
            v-show="loadings.core"
        />
    </transition>
    <transition name="loaders-fade">
        <LoadingSide
            v-show="isLoading"
        />
    </transition>
</template>

<style lang="scss">
.page-content {
    max-width: 1280px;
    margin: 0 auto;
}

.loaders-fade {
    &-enter-active,
    &-leave-active {
        transition: opacity 0.2s;
    }

    &-enter,
    &-leave-to {
        opacity: 0;
    }
}

.toast-container{
    position: absolute;
    bottom: 0;
    right: 0;
}
</style>
