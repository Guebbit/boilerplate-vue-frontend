<script setup lang="ts">
/**
 * @module
 * Renders nothing; listens for the two things that open a tour. The first sign-in on a browser
 * opens `welcome` once its anchors are on screen, and a `?tour=<id>` query parameter opens that
 * tour on any route (then the parameter is removed, so a reload does not reopen it). A "?" button
 * or the account menu asks for a tour the same way, by setting that parameter.
 */
import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { warn } from '@/infrastructure/utils/logger.ts';
import { readToursEnabled } from '@/infrastructure/runtime-config.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { SIGN_IN_ROUTE_NAME } from '@/app/router/navigation.ts';
import { isKnownTour, TOURS, WELCOME_TOUR_ID } from '@/app/tours/catalogue.ts';
import { useTour } from '@/app/tours/use-tour.ts';

/**
 * Router, for stripping `?tour=` once it is handled.
 */
const router = useRouter();

/**
 * Current route, whose `tour` query asks for a replay and whose name tells the sign-in screen apart.
 */
const route = useRoute();

/**
 * The session: a viewer plus loaded abilities means a sign-in has fully landed.
 */
const session = useSessionStore();

/**
 * The signed-in account, reactive.
 */
const { viewer } = storeToRefs(session);

/**
 * Tour runner.
 */
const { startTour, hasSeen } = useTour();

/**
 * Whether the account's abilities have arrived. They come a moment after the viewer, and the nav
 * (so the tour's anchors) renders from them.
 */
const abilitiesLoaded = () => session.tenantAbility.rules.length > 0;

/**
 * The `?tour=` value as a single string, or `undefined` when absent or repeated.
 */
const requestedTour = () => (typeof route.query.tour === 'string' ? route.query.tour : undefined);

/**
 * Opens a tour; a driver.js chunk that fails to load is logged, never thrown into a watcher.
 *
 * @param tourId - A catalogue id.
 */
const open = (tourId: string) =>
    startTour(tourId).catch((error: unknown) => {
        warn('tours', 'could not open tour', tourId, error);
        return false;
    });

/**
 * Replay by `?tour=`. Strips the parameter first so the address bar and history stay clean, and
 * ignores an unknown id without a word.
 */
watch(
    requestedTour,
    (tourId) => {
        if (tourId === undefined || !readToursEnabled()) return;
        const rest = Object.fromEntries(
            Object.entries(route.query).filter(([name]) => name !== 'tour')
        );
        void router
            .replace({ query: rest })
            .then(() => (isKnownTour(tourId) ? open(tourId) : false));
    },
    { immediate: true, flush: 'post' }
);

/**
 * First sign-in on this browser: the welcome tour, once, after the sign-in screen has gone.
 */
watch(
    () => [viewer.value?.id, abilitiesLoaded(), route.name] as const,
    ([accountId, ready, routeName]) => {
        if (!readToursEnabled() || !TOURS[WELCOME_TOUR_ID].auto) return;
        if (!accountId || !ready || routeName === SIGN_IN_ROUTE_NAME) return;
        if (requestedTour() !== undefined || hasSeen(WELCOME_TOUR_ID)) return;
        void open(WELCOME_TOUR_ID);
    },
    { immediate: true, flush: 'post' }
);
</script>

<template>
    <span hidden />
</template>
