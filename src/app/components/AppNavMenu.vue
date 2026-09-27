<script setup lang="ts">
/**
 * @module
 * Generic dropdown-menu shell around `AppNavIconButton`: renders a list of `AppNavItem`s as a
 * `role="menu"`, used for both the account menu and the admin menu.
 */
import { ref } from 'vue';
import type { Component, ComponentPublicInstance } from 'vue';
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
    /**
     * Locale-prefixed destination.
     */
    to: RouteLocationRaw;
    /**
     * Lucide icon shown before the label; entries with none render no icon slot.
     */
    icon?: Component;
    /**
     * Live count; `undefined` renders no badge.
     */
    badge?: number;
    /**
     * Live text beside the icon of a pinned entry; `undefined` renders none.
     */
    detail?: string;
    /**
     * Lifted out of its section's menu onto the bar, beside the account menu.
     */
    pinned?: boolean;
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
    /**
     * Entries rendered as `menuitem`s, in order.
     */
    items: AppNavItem[];
    /**
     * Translated name of the menu: tooltip, accessible name and the list's label.
     */
    label: string;
    /**
     * Activator icon, shown unless {@link avatar} is set.
     */
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
    /**
     * Forwarded to the activator button as `data-test`, for e2e targeting.
     */
    dataTest?: string;
}>();

/**
 * Translation function for badge labels.
 */
const { t } = useI18n();

/**
 * Whether `v-menu` currently considers itself open — read by {@link focusFirstItemOnOpen} to
 * ignore an `afterEnter` that fires after a very fast close (Escape pressed before the enter
 * transition finished), so a closing menu never steals focus back into itself.
 */
const menuOpen = ref(false);

/**
 * The rendered `v-list`, queried for its first `menuitem` once the menu has fully opened.
 */
const listElement = ref<ComponentPublicInstance | null>(null);

/**
 * WAI-ARIA APG menu-button pattern: opening a menu (by click, Enter, Space or an arrow key)
 * moves focus onto its first item. `v-menu`'s own single `focusChild()` call already does this
 * most of the time; this is the fallback for when that call landed while the opening transition
 * still had the content `visibility: hidden`, which makes `.focus()` silently no-op under load.
 * https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 *
 * Guarded on focus not already being inside the menu, rather than on the activator specifically:
 * by the time the transition's `afterEnter` fires, `focusChild()` has normally already succeeded.
 */
const focusFirstItemOnOpen = () => {
    if (!menuOpen.value) return;
    // `$el` is typed loosely on a component instance; this ref only ever points at the `v-list`
    // above, which always renders a real element.
    const content = listElement.value?.$el as HTMLElement | undefined;
    if (!content || content.contains(document.activeElement)) return;
    content.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
};
</script>

<template>
    <v-menu v-model="menuOpen" location="bottom end" @after-enter="focusFirstItemOnOpen">
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

        <v-list ref="listElement" density="compact" role="menu" :aria-label="label">
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
