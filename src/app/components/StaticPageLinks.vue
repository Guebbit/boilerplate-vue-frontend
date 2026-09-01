<script setup lang="ts">
/**
 * @module
 * The cross-links at the bottom of every prose page (about/FAQ/terms/privacy): the other three
 * pages of `STATIC_PAGES`, so one nav entry (About) reaches all four. One component, so the
 * four pages cannot drift on which siblings they link.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { STATIC_PAGES, staticPageRouteName } from '@/app/utils/static-pages.ts';
import type { StaticPageName } from '@/app/utils/static-pages.ts';

/**
 * Component props — see each field's own doc comment below.
 */
const { current } = defineProps<{
    /**
     * The page rendering the links, left out of its own list.
     */
    current: StaticPageName;
}>();

/**
 * Translation function for the link titles and the landmark's name.
 */
const { t } = useI18n();

/**
 * The sibling pages, in the shared order.
 */
const siblings = computed(() => STATIC_PAGES.filter((name) => name !== current));
</script>

<template>
    <v-divider class="my-6" />
    <nav class="flex flex-wrap gap-4 text-sm" :aria-label="t('static-pages.related')">
        <RouterLink
            v-for="name in siblings"
            :key="'link-' + name"
            class="underline opacity-80"
            :to="routerLinkI18n({ name: staticPageRouteName(name) })"
        >
            {{ t(`static-pages.${name}.title`) }}
        </RouterLink>
    </nav>
</template>
