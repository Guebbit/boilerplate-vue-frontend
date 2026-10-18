<script setup lang="ts">
import { RouterView } from 'vue-router';
import { routeAnnouncement } from '@/app/router/announcer.ts';
import { useThemeColorMeta } from '@/ui/composables/use-theme-color-meta.ts';

/**
 * @module
 * The composition root, and deliberately almost empty.
 *
 * Everything a running application needs is installed in `src/main.ts` (pinia, the router, i18n,
 * vuetify) or contributed by a module through `src/kernel/registry.ts`. Nothing that belongs to
 * one domain belongs here: this is the file every derived project opens first, and state parked
 * in it outlives the folder it came from.
 *
 * The one thing it renders besides the view is the route announcer: a live region the router
 * writes the new page's title into after every navigation, so a screen reader says what changed.
 * It lives here, outside every layout, because it has to exist before the first page mounts and
 * survive the swap between two of them — a region that is re-created with the page is never
 * heard.
 *
 * It also keeps the browser's address-bar colour in step with the theme (`useThemeColorMeta`):
 * app-wide, and not any one page's concern.
 */
useThemeColorMeta();
</script>

<template>
    <RouterView />
    <p
        class="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-test="route-announcer"
    >
        {{ routeAnnouncement }}
    </p>
</template>
