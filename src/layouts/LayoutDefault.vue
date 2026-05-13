<template>
    <Navigation>
        <slot name="navigation" />
        <h3 v-if="isAuth && profile">Hello {{ profile.email }}</h3>
    </Navigation>

    <div v-show="messages.length > 0" class="toast-container">
        <div
            v-for="alert in messages"
            :key="'alert-' + alert.id"
            v-show="alert.visible"
            :class="['theme-card', alert.type]"
        >
            {{ alert.message }}
            <button class="theme-button" @click="hideMessage(alert.id)">X</button>
        </div>
    </div>

    <main
        class="page-content"
        :class="{
            'full-page centered': centered
        }"
        v-bind="$attrs"
    >
        <div v-if="slots.header">
            <slot name="header" />
        </div>

        <div class="page-container">
            <slot />
        </div>
    </main>

    <transition name="loaders-fade">
        <LoadingCore v-show="loadings.core" />
    </transition>
    <transition name="loaders-fade">
        <LoadingSide v-show="isLoading" />
    </transition>
</template>

<style lang="scss">
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

.toast-container {
    position: fixed;
    bottom: 0;
    right: 0;
    z-index: 9999;
}
</style>

<script setup lang="ts">
import { useSlots } from 'vue';
import { storeToRefs } from 'pinia';
import LoadingCore from '@/components/ui/LoadingCore.vue';
import LoadingSide from '@/components/ui/LoadingSide.vue';
import Navigation from '@/components/shared/Navigation.vue';
import { useCoreStore, useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { getCookie } from '@/utils/generics.ts';

/**
 *
 */
defineProps<{
    /**
     * If the content should be minimum full page and centered
     */
    centered?: boolean;
}>();

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
const { loadings, isLoading } = storeToRefs(useCoreStore());

/**
 * Toasts
 */
const { messages } = storeToRefs(useNotificationsStore());
const { hideMessage } = useNotificationsStore();

/**
 * Profile
 */
const { profile, isAuth } = storeToRefs(useProfileStore());
const { fetchProfile } = useProfileStore();

/**
 * Fetch current user profile (if logged in)
 */
if (getCookie('isAuth') && !profile.value)
    fetchProfile().catch((error) => {
        if (import.meta.env.DEV)
            // eslint-disable-next-line no-console
            console.warn('Unable to preload profile from layout', error);
    });
</script>
