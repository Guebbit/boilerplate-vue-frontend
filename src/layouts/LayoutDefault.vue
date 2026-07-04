<template>
    <VApp>
        <AppNavigation>
            <slot name="navigation" />
            <span v-if="isAuth && profile" class="text-subtitle-2 mx-2">
                Hello {{ profile.email }}
            </span>
        </AppNavigation>

        <div v-show="messages.length > 0" class="toast-container pa-4">
            <VAlert
                v-for="alert in messages"
                :key="'alert-' + alert.id"
                v-show="alert.visible"
                :type="toAlertType(alert.type)"
                class="mb-2"
                closable
                @click:close="hideMessage(alert.id)"
            >
                {{ alert.message }}
            </VAlert>
        </div>

        <VMain
            class="page-content"
            :class="{
                'd-flex flex-column align-center justify-center': centered
            }"
            v-bind="$attrs"
        >
            <div v-if="slots.header">
                <slot name="header" />
            </div>

            <VContainer class="page-container" max-width="1280">
                <slot />
            </VContainer>
        </VMain>

        <transition name="loaders-fade">
            <FeedbackLoadingCore v-show="loadings.core" />
        </transition>
        <transition name="loaders-fade">
            <FeedbackLoadingSide v-show="isLoading" />
        </transition>
    </VApp>
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
import { VApp, VMain, VContainer, VAlert } from 'vuetify/components';
import FeedbackLoadingCore from '@/components/molecules/FeedbackLoadingCore.vue';
import FeedbackLoadingSide from '@/components/molecules/FeedbackLoadingSide.vue';
import AppNavigation from '@/components/organisms/AppNavigation.vue';
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

/*
 * Maps a notification type to a VAlert type.
 * @param type - notification type from the store
 * @returns VAlert type
 */
const toAlertType = (type?: string): 'error' | 'success' | 'warning' | 'info' => {
    if (type === 'error' || type === 'success' || type === 'warning' || type === 'info')
        return type;
    return 'info';
};

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
