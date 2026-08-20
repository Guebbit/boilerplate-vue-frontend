<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTheme } from 'vuetify';
import { storeToRefs } from 'pinia';
import { Menu, Moon, Sun, UserRound } from 'lucide-vue-next';
import AppLanguageSwitcher from '@/app/components/AppLanguageSwitcher.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import {
    loginContinueTo,
    SIGN_IN_ROUTE_NAME,
    SIGN_UP_ROUTE_NAME
} from '@/app/router/navigation.ts';
import { canAccess } from '@/app/guards/authentications.ts';
import { useSessionStore } from '@/infrastructure/stores/session.ts';
import { collectModuleNavigation, sortNavigation } from '@/kernel/registry';
import type { AppNavigationEntry } from '@/kernel/registry';
import { enabledModules } from '@/modules';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const { isAuth, isAdmin, viewer } = storeToRefs(useSessionStore());

/**
 * Vite public base path (always slash-terminated), used to resolve assets
 * served from `public/` no matter where the app is mounted.
 */
const baseUrl = import.meta.env.BASE_URL;

/**
 * Mobile drawer open state
 */
const drawer = ref(false);

/**
 * The two entries the app shell owns, because their routes belong to no domain.
 *
 * Everything else is contributed by whichever modules are enabled — see `navigation` in each
 * `module.ts`. This component no longer knows that products or orders exist, which is the point:
 * deleting a domain removes its menu entry with it, instead of leaving a link to a route that no
 * longer resolves.
 *
 * `order` is shared across both sources and spaced by tens, so a shell entry and a module entry
 * can interleave.
 */
const shellNavEntries: AppNavigationEntry[] = [
    { name: 'Home', label: 'navigation.label-home', plural: 1, order: 10 },
    // One entry reaches all four prose pages — they cross-link at the bottom.
    { name: 'StaticAbout', label: 'navigation.label-about', plural: 1, order: 99 }
];

/**
 * Platform entries plus every enabled module's, ranked by `order`.
 *
 * Deliberately carries no visibility flag. Whether a visitor may see an entry is a property of
 * the route it points at (`meta.access`), and restating it here is what let the menu and the
 * router disagree — see {@link canAccess}. An entry's permissions come along with its route.
 */
/*
 * Whether this build ships sign-in at all. The account module owns those routes, and the shell
 * addresses them by name — a string nothing type-checks — so it asks the router rather than
 * assuming. A build with no account module simply shows no auth buttons.
 */
const hasSignIn = computed(() => router.hasRoute(SIGN_IN_ROUTE_NAME));
const hasSignUp = computed(() => router.hasRoute(SIGN_UP_ROUTE_NAME));

const navEntries = sortNavigation([...shellNavEntries, ...collectModuleNavigation(enabledModules)]);

/*
 * Live counts, one per entry that declared a `badge` accessor. Materialised ONCE here rather than
 * inside the computed below: an accessor may start watchers and fetches (the cart's does), and a
 * computed that re-ran it on every recompute would re-arm them each time. The shell still names
 * no domain — whose store each ref reads is the module's business.
 */
const badgeCounts = new Map(
    navEntries.filter((entry) => entry.badge).map((entry) => [entry.name, entry.badge!()] as const)
);

/**
 * Nav entries this visitor may see: rendered inline on desktop, as a drawer list on mobile.
 *
 * Each entry's requirement is read off the resolved route, so the menu shows exactly the pages
 * the router would let the visitor enter.
 *
 * @returns The localized, locale-prefixed visible entries.
 */
const visibleNavItems = computed(() => {
    const visitor = { isAuth: isAuth.value, isAdmin: isAdmin.value };
    return navEntries
        .filter(({ name }) => canAccess(router.resolve({ name }).meta.access, visitor))
        .map(({ name, label, plural }) => ({
            // `plural` is optional on the manifest: a module that has not thought about it gets
            // the singular, which is what every entry wanted before the field existed.
            title: t(label, plural ?? 1),
            to: routerLinkI18n({ name }),
            // Unwrapped here so the menu re-renders when a module's count moves.
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- a ZERO badge must render as no badge; `??` would pin a `0` chip on the menu
            badge: badgeCounts.get(name)?.value || undefined
        }));
});

const theme = useTheme();

/**
 * Light/dark toggle. The default follows the OS ("system"); the first click pins
 * an explicit theme.
 */
const toggleTheme = () => {
    theme.global.name.value = theme.current.value.dark ? 'light' : 'dark';
};
</script>

<template>
    <v-app-bar flat border="b" density="comfortable">
        <!-- Mobile: hamburger -->
        <template #prepend>
            <v-app-bar-nav-icon
                class="lg:hidden"
                :aria-label="t('navigation.label-menu')"
                @click="drawer = !drawer"
            >
                <Menu :size="22" aria-hidden="true" />
            </v-app-bar-nav-icon>
            <RouterLink :to="routerLinkI18n({ name: 'Home' })" class="flex items-center">
                <img
                    :alt="t('navigation.label-logo')"
                    class="mx-2 block h-9"
                    :src="`${baseUrl}images/guebbit-logo-colored.png`"
                />
            </RouterLink>
        </template>

        <!-- Desktop: inline nav -->
        <nav class="hidden lg:flex items-center gap-1" :aria-label="t('navigation.label-menu')">
            <v-btn
                v-for="item in visibleNavItems"
                :key="item.title"
                :to="item.to"
                variant="text"
                class="px-3 capitalize"
            >
                {{ item.title }}
                <v-badge
                    v-if="item.badge"
                    :content="item.badge"
                    color="primary"
                    inline
                    data-test="nav-badge"
                />
            </v-btn>
            <slot name="nav-left" />
        </nav>

        <slot />

        <template #append>
            <div class="flex items-center gap-1">
                <slot name="nav-right" />

                <v-chip
                    v-if="isAuth && viewer"
                    variant="tonal"
                    color="secondary"
                    class="mr-1 hidden md:inline-flex"
                >
                    <UserRound :size="14" class="mr-1" aria-hidden="true" />
                    {{ viewer.email }}
                </v-chip>

                <v-btn
                    v-if="hasSignIn"
                    v-show="!isAuth && route.name !== SIGN_IN_ROUTE_NAME"
                    variant="text"
                    @click="router.push(routerLinkI18n(loginContinueTo(route.fullPath)))"
                >
                    {{ t('navigation.label-login') }}
                </v-btn>
                <v-btn
                    v-if="hasSignUp"
                    v-show="!isAuth && route.name !== SIGN_UP_ROUTE_NAME"
                    color="primary"
                    class="hidden sm:inline-flex"
                    @click="router.push(routerLinkI18n({ name: SIGN_UP_ROUTE_NAME }))"
                >
                    {{ t('navigation.label-signup') }}
                </v-btn>
                <v-btn
                    v-show="isAuth"
                    variant="text"
                    @click="router.push(routerLinkI18n({ name: 'Logout' }))"
                >
                    {{ t('navigation.label-logout') }}
                </v-btn>

                <v-btn
                    icon
                    variant="text"
                    :aria-label="t('navigation.label-theme')"
                    @click="toggleTheme"
                >
                    <Sun v-if="theme.current.value.dark" :size="20" aria-hidden="true" />
                    <Moon v-else :size="20" aria-hidden="true" />
                </v-btn>

                <AppLanguageSwitcher />
            </div>
        </template>
    </v-app-bar>

    <!-- Mobile: drawer -->
    <v-navigation-drawer v-model="drawer" temporary>
        <v-list nav :aria-label="t('navigation.label-menu')">
            <v-list-item
                v-for="item in visibleNavItems"
                :key="'drawer-' + item.title"
                :to="item.to"
                color="primary"
                class="capitalize"
            >
                <v-list-item-title>
                    {{ item.title }}
                    <v-badge v-if="item.badge" :content="item.badge" color="primary" inline />
                </v-list-item-title>
            </v-list-item>

            <v-divider class="my-2" />

            <v-list-item
                v-if="!isAuth && hasSignIn"
                color="primary"
                @click="router.push(routerLinkI18n(loginContinueTo(route.fullPath)))"
            >
                <v-list-item-title>{{ t('navigation.label-login') }}</v-list-item-title>
            </v-list-item>
            <v-list-item
                v-if="!isAuth && hasSignUp"
                color="primary"
                @click="router.push(routerLinkI18n({ name: SIGN_UP_ROUTE_NAME }))"
            >
                <v-list-item-title>{{ t('navigation.label-signup') }}</v-list-item-title>
            </v-list-item>
            <v-list-item
                v-if="isAuth"
                color="primary"
                @click="router.push(routerLinkI18n({ name: 'Logout' }))"
            >
                <v-list-item-title>{{ t('navigation.label-logout') }}</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-navigation-drawer>
</template>
