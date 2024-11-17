<template>

    <Navigation />

    <main class="page-content">
        <pre>{{ messages }}</pre>
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

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import LoadingCore from '@/components/atoms/LoadingCore.vue'
import LoadingSide from '@/components/atoms/LoadingSide.vue'
import Navigation from '@/components/organisms/Navigation.vue'
import { useCoreStore } from '@/stores/core'
import { useToastStore } from '@/stores/toasts'

/**
 * Users store
 */
const {
    messages
} = storeToRefs(useToastStore())

/**
 * core loading
 */
const {
    loadings,
    isLoading
} = storeToRefs(useCoreStore())

</script>

<style lang="scss">
.page-content {
    max-width: 1280px;
    margin: 0 auto;
}

.loaders-fade{
    &-enter-active,
    &-leave-active {
        transition: opacity 0.2s;
    }

    &-enter,
    &-leave-to {
        opacity: 0;
    }
}
</style>
