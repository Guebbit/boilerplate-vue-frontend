<script setup lang="ts">
/**
 * @module
 * Generic dropdown-menu shell around `AppNavIconButton`: renders a list of `AppNavItem`s as a
 * `role="menu"`, used for both the account menu and the admin menu.
 */
import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppNavIconButton from '@/app/components/AppNavIconButton.vue';

/**
 * One navigation entry, resolved for the current visitor: translated, locale-prefixed, counted.
 */
export interface AppNavItem {
    /**
     * Route name, stable across locales — the `key` of every render.
     */
    name: string;
    /**
     * Translated label.
     */
    title: string;
    to: RouteLocationRaw;
    icon?: Component;
    /**
     * Live count; `undefined` renders no badge.
     */
    badge?: number;
}

/**
 * A dropdown of navigation entries behind one icon button.
 *
 * The same component serves the administration menu and the account menu, so both get the same
 * keyboard contract: Vuetify's `v-menu` opens on ArrowDown, walks entries with the arrows, and on
 * Escape closes and returns focus to the activator. What is added here is the menu semantics
 * the list does not carry on its own — `role="menu"` with `menuitem` children, as the language
 * switcher does — and the `#after` slot for an action that belongs in the menu but is not a
 * page, such as logout.
 */
defineProps<{
    items: AppNavItem[];
    /**
     * Translated name of the menu: tooltip, accessible name and the list's label.
     */
    label: string;
    icon: Component;
    /**
     * Folded into the activator's accessible name, shown as a heading inside the menu.
     */
    description?: string;
    /**
     * A count the activator wears, e.g. the cart's, so it stays visible while the menu is shut.
     */
    badge?: number;
    /**
     * Shows the visitor's picture on the activator instead of `icon` — the account menu only.
     */
    avatar?: boolean;
    /**
     * The visitor's `imageUrl`, unresolved. Only read when {@link avatar} is set.
     */
    avatarUrl?: string | null;
    /**
     * The visitor's `thumbnailUrl`, unresolved. Only read when {@link avatar} is set.
     */
    avatarThumbnailUrl?: string | null;
    dataTest?: string;
}>();

const { t } = useI18n();
</script>

<template>
    <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
            <AppNavIconButton
                v-bind="menuProps"
                :label="label"
                :icon="icon"
                :description="description"
                :badge="badge"
                :badge-label="badge ? t('navigation.badge-items', badge) : undefined"
                :avatar="avatar"
                :avatar-url="avatarUrl"
                :avatar-thumbnail-url="avatarThumbnailUrl"
                :data-test="dataTest"
            />
        </template>

        <v-list density="compact" role="menu" :aria-label="label">
            <!--
                Decorative for the reader: the description is already part of the activator's
                name, and a role-less heading inside a `menu` is not a permitted child.
            -->
            <v-list-subheader v-if="description" aria-hidden="true" class="max-w-64 truncate">
                {{ description }}
            </v-list-subheader>

            <v-list-item
                v-for="item in items"
                :key="item.name"
                role="menuitem"
                :to="item.to"
                color="primary"
            >
                <template v-if="item.icon" #prepend>
                    <component :is="item.icon" :size="20" class="mr-3" aria-hidden="true" />
                </template>
                <v-list-item-title>
                    {{ item.title }}
                    <v-badge
                        v-if="item.badge"
                        :content="item.badge"
                        :label="t('navigation.badge-items', item.badge)"
                        color="primary"
                        inline
                    />
                </v-list-item-title>
            </v-list-item>

            <slot name="after" />
        </v-list>
    </v-menu>
</template>
