<script setup lang="ts">
import { useSlots, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useLocale } from 'vuetify';
import AppNavigation from '@/components/organisms/AppNavigation.vue';
import { useCoreStore, useNotificationsStore } from '@guebbit/vue-toolkit';
import { getCookie } from '@guebbit/js-toolkit';
import { useProfileStore } from '@/stores/profile.ts';

defineOptions({ inheritAttrs: false });

defineProps<{
    /**
     * Default page title rendered in the hero (overridable via #header slot)
     */
    title?: string;
    /**
     * If the content should be minimum full page and centered
     */
    centered?: boolean;
}>();

/**
 * Slots
 * - default
 * - header (replaces the default hero title)
 * - navigation
 */
const slots = useSlots();

const { t, locale } = useI18n();

/**
 * Keep Vuetify's internal strings (data-table, pagination, aria-labels…)
 * in sync with the app locale.
 */
const { current: vuetifyLocale } = useLocale();
watch(
    locale,
    (newLocale) => {
        vuetifyLocale.value = newLocale;
    },
    { immediate: true }
);

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
 * Coerces free-form message types into what `v-alert` accepts.
 *
 * @param type - Type carried by the notification, possibly unset or unknown.
 * @returns The matching alert type, or `'info'` as a neutral fallback.
 */
const normalizeAlertType = (type?: string): 'success' | 'info' | 'warning' | 'error' =>
    type === 'success' || type === 'warning' || type === 'error' ? type : 'info';

/**
 * Profile
 */
const { profile } = storeToRefs(useProfileStore());
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

<template>
    <v-app>
        <AppNavigation>
            <slot name="navigation" />
        </AppNavigation>

        <v-main v-bind="$attrs">
            <!-- Page hero: every view gets a consistent, accessible title area -->
            <header v-if="slots.header || title" class="page-hero py-8 lg:py-10">
                <div class="mx-auto w-full max-w-[1280px] px-4">
                    <slot name="header">
                        <h1 class="text-3xl lg:text-4xl font-bold tracking-tight">
                            {{ title }}
                        </h1>
                        <div
                            class="mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-tertiary"
                            aria-hidden="true"
                        />
                    </slot>
                </div>
            </header>

            <div
                class="mx-auto w-full max-w-[1280px] px-4 pb-12"
                :class="
                    centered && 'flex min-h-[60vh] flex-col items-center justify-center text-center'
                "
            >
                <slot />
            </div>
        </v-main>

        <!-- Toast stack (screen-reader friendly: announced politely) -->
        <div
            class="fixed bottom-4 right-4 z-[9999] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
            aria-live="polite"
        >
            <template v-for="alert in messages" :key="'alert-' + alert.id">
                <v-alert
                    v-show="alert.visible"
                    :type="normalizeAlertType(alert.type)"
                    closable
                    density="comfortable"
                    elevation="4"
                    :text="alert.message"
                    @click:close="hideMessage(alert.id)"
                />
            </template>
        </div>

        <!-- Full-page loader (core bootstrapping) -->
        <v-overlay
            :model-value="!!loadings.core"
            persistent
            class="flex items-center justify-center"
        >
            <!--
                The label is required, not decorative: this renders role="progressbar", and a
                progressbar with no accessible name is announced as an unlabelled control. It is
                also the only thing on screen while the app boots, so without it a screen-reader
                user is told nothing at all is happening.
            -->
            <v-progress-circular
                indeterminate
                size="64"
                width="5"
                color="primary"
                :aria-label="t('generic.loading-state')"
            />
        </v-overlay>

        <!-- Discreet corner loader (background activity) -->
        <v-fade-transition>
            <div
                v-show="isLoading && !loadings.core"
                class="fixed bottom-4 left-4 z-[9998]"
                role="status"
                :aria-label="t('generic.loading-state')"
            >
                <!--
                    Labelled even though the wrapper above carries role="status" and the same
                    label: the wrapper names the live region, while this element is a separate
                    role="progressbar" node that needs its own name.
                -->
                <v-progress-circular
                    indeterminate
                    size="40"
                    width="4"
                    color="secondary"
                    :aria-label="t('generic.loading-state')"
                />
            </div>
        </v-fade-transition>
    </v-app>
</template>
