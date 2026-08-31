<script setup lang="ts">
/**
 * @module
 * App shell navigation bar/drawer. Merges the shell's own two nav entries with whatever the
 * enabled modules contribute (via the kernel registry), filters each section by `canAccess`,
 * and renders the result as the desktop bar, the account/admin menus and the mobile drawer.
 */
import { computed, nextTick, ref, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTheme } from 'vuetify';
import { storeToRefs } from 'pinia';
import {
    CircleUserRound,
    House,
    Info,
    LogOut,
    Menu,
    Moon,
    ShieldCheck,
    Sun
} from 'lucide-vue-next';
import AppLanguageSwitcher from '@/app/components/AppLanguageSwitcher.vue';
import AppNavMenu from '@/app/components/AppNavMenu.vue';
import type { AppNavItem } from '@/app/components/AppNavMenu.vue';
import AppNavIconButton from '@/app/components/AppNavIconButton.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import {
    loginContinueTo,
    SIGN_IN_ROUTE_NAME,
    SIGN_UP_ROUTE_NAME
} from '@/app/router/navigation.ts';
import { canAccess } from '@/app/guards/authentications.ts';
import { useSessionStore } from '@/infrastructure/stores/session.ts';
import { collectModuleNavigation, groupNavigation, NAVIGATION_SECTIONS } from '@/kernel/registry';
import type { AppNavigationEntry, AppNavigationSection } from '@/kernel/registry';
import { enabledModules } from '@/modules';

/**
 * Router instance used to resolve routes' `meta.access` and to navigate on logout.
 */
const router = useRouter();

/**
 * Current route — read for its name (hiding the login/signup link on their own pages)
 * and its full path (the login redirect target).
 */
const route = useRoute();

/**
 * Translation function for nav labels.
 */
const { t } = useI18n();

/**
 * Session flags and the signed-in visitor, used to filter nav entries and render the account menu.
 */
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
 * The hamburger, so focus can go back to it when the drawer closes.
 */
const hamburger = ref<ComponentPublicInstance | null>(null);

/**
 * The drawer's element id: what the hamburger's `aria-controls` points at.
 */
const DRAWER_ID = 'app-drawer';

/**
 * Focus follows the drawer (WCAG 2.4.3): onto its first entry when it opens, back onto the
 * hamburger when it closes. Next tick, because the drawer renders its content after the flag
 * flips, and the element to focus does not exist yet when this runs.
 */
watch(drawer, (isOpen) => {
    void nextTick(() => {
        if (isOpen) {
            document
                .querySelector<HTMLElement>(
                    `#${DRAWER_ID} a[href], #${DRAWER_ID} button, #${DRAWER_ID} [tabindex="0"]`
                )
                ?.focus();
            return;
        }
        const element = hamburger.value?.$el as HTMLElement | undefined;
        element?.focus();
    });
});

/**
 * The two entries the app shell owns, because their routes belong to no domain.
 *
 * Everything else is contributed by whichever modules are enabled — see `navigation` in each
 * `module.ts`. This component does not know that products or orders exist, which is the point:
 * deleting a domain removes its menu entry with it, instead of leaving a link to a route that no
 * longer resolves. What the shell does know is the three PLACES an entry can sit — the bar, the
 * account menu, the administration menu — and a module picks one with `section`.
 *
 * `order` is shared across both sources and spaced by tens, so a shell entry and a module entry
 * can interleave.
 */
const shellNavEntries: AppNavigationEntry[] = [
    { name: 'Home', label: 'navigation.label-home', plural: 1, order: 10, icon: House },
    // One entry reaches all four prose pages — they cross-link at the bottom.
    { name: 'StaticAbout', label: 'navigation.label-about', plural: 1, order: 99, icon: Info }
];

/**
 * Whether this build ships sign-in at all. The account module owns those routes, and the shell
 * addresses them by name — a string nothing type-checks — so it asks the router rather than
 * assuming. A build with no account module simply shows no auth buttons.
 */
const hasSignIn = computed(() => router.hasRoute(SIGN_IN_ROUTE_NAME));

/**
 * Whether this build ships sign-up, same reasoning as {@link hasSignIn}.
 */
const hasSignUp = computed(() => router.hasRoute(SIGN_UP_ROUTE_NAME));

/**
 * Every nav entry — the shell's own plus every enabled module's — grouped by section.
 */
const navSections = groupNavigation([
    ...shellNavEntries,
    ...collectModuleNavigation(enabledModules)
]);

/**
 * Live counts, one per entry that declared a `badge` accessor. Materialised ONCE here rather than
 * inside the computed below: an accessor may start watchers and fetches (the cart's does), and a
 * computed that re-ran it on every recompute would re-arm them each time. The shell still names
 * no domain — whose store each ref reads is the module's business.
 */
const badgeCounts = new Map(
    Object.values(navSections)
        .flat()
        .filter((entry) => entry.badge)
        .map((entry) => [entry.name, entry.badge!()] as const)
);

/**
 * Nav entries this visitor may see, one list per section.
 *
 * Deliberately no visibility flag on the entries. Each entry's requirement is read off the
 * resolved route, so the menu shows exactly the pages the router would let the visitor enter —
 * see {@link canAccess}. A section whose every entry is out of reach comes back empty, and the
 * chrome that would have shown it (the admin menu, a drawer heading) does not render.
 *
 * @returns The localized, locale-prefixed visible entries, keyed by section.
 */
const visibleSections = computed((): Record<AppNavigationSection, AppNavItem[]> => {
    const visitor = { isAuth: isAuth.value, isAdmin: isAdmin.value };
    const resolve = (entries: AppNavigationEntry[]): AppNavItem[] =>
        entries
            .filter(({ name }) => canAccess(router.resolve({ name }).meta.access, visitor))
            .map(({ name, label, plural, icon }) => ({
                name,
                // `plural` is optional on the manifest: a module that has not thought about it
                // gets the singular, which is what every entry wanted before the field existed.
                title: t(label, plural ?? 1),
                to: routerLinkI18n({ name }),
                icon,
                // Unwrapped here so the menu re-renders when a module's count moves.
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- a ZERO badge must render as no badge; `??` would pin a `0` chip on the menu
                badge: badgeCounts.get(name)?.value || undefined
            }));
    return {
        main: resolve(navSections.main),
        account: resolve(navSections.account),
        admin: resolve(navSections.admin)
    };
});

/**
 * The one count the account menu wears while shut: whichever of its entries has a badge. With
 * several badged entries the first wins — the activator has room for one number, and the menu
 * itself shows each count beside its entry.
 */
const accountBadge = computed(
    () => visibleSections.value.account.find((item) => item.badge)?.badge
);

/**
 * Navigates to the logout route, ending the session.
 */
const logout = () => router.push(routerLinkI18n({ name: 'Logout' }));

/**
 * Vuetify theme controller, used to read/toggle light vs dark.
 */
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
                ref="hamburger"
                class="lg:hidden"
                :aria-label="t('navigation.label-menu')"
                :aria-expanded="drawer"
                :aria-controls="DRAWER_ID"
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

        <!-- Desktop: the main section, icon-only. Each glyph is named and tooltipped by its label. -->
        <nav class="hidden lg:flex items-center gap-1" :aria-label="t('navigation.label-menu')">
            <AppNavIconButton
                v-for="item in visibleSections.main"
                :key="item.name"
                :to="item.to"
                :label="item.title"
                :icon="item.icon!"
                :badge="item.badge"
                :badge-label="item.badge ? t('navigation.badge-items', item.badge) : undefined"
            />
            <slot name="nav-left" />
        </nav>

        <slot />

        <template #append>
            <div class="flex items-center gap-1">
                <slot name="nav-right" />

                <AppNavMenu
                    v-if="visibleSections.admin.length > 0"
                    :items="visibleSections.admin"
                    :label="t('navigation.label-admin-menu')"
                    :icon="ShieldCheck"
                    data-test="admin-menu"
                />

                <!--
                    Links, not buttons: they go somewhere, so a screen reader should say so and a
                    middle-click should open a tab. One `v-if` each — a `v-show`-hidden button is
                    still in the tab order, invisible and focusable.
                -->
                <v-btn
                    v-if="hasSignIn && !isAuth && route.name !== SIGN_IN_ROUTE_NAME"
                    variant="text"
                    :to="routerLinkI18n(loginContinueTo(route.fullPath))"
                >
                    {{ t('navigation.label-login') }}
                </v-btn>
                <v-btn
                    v-if="hasSignUp && !isAuth && route.name !== SIGN_UP_ROUTE_NAME"
                    color="primary"
                    class="hidden sm:inline-flex"
                    :to="routerLinkI18n({ name: SIGN_UP_ROUTE_NAME })"
                >
                    {{ t('navigation.label-signup') }}
                </v-btn>

                <!--
                    The signed-in visitor's own menu: their pages, then logout. Logout stays a
                    menu item that acts rather than a link: it mutates the session, it does not
                    merely navigate.
                -->
                <AppNavMenu
                    v-if="isAuth && viewer"
                    :items="visibleSections.account"
                    :label="t('navigation.label-account-menu')"
                    :description="viewer.email"
                    :icon="CircleUserRound"
                    :badge="accountBadge"
                    :avatar="true"
                    :avatar-url="viewer.imageUrl"
                    :avatar-thumbnail-url="viewer.thumbnailUrl"
                    data-test="user-menu"
                >
                    <template #after>
                        <v-divider class="my-1" />
                        <v-list-item
                            role="menuitem"
                            color="primary"
                            data-test="logout"
                            @click="logout"
                        >
                            <template #prepend>
                                <LogOut :size="20" class="mr-3" aria-hidden="true" />
                            </template>
                            <v-list-item-title>{{
                                t('navigation.label-logout')
                            }}</v-list-item-title>
                        </v-list-item>
                    </template>
                </AppNavMenu>

                <!-- `data-test`: the a11y sweep flips the theme through this, in every locale. -->
                <v-btn
                    icon
                    variant="text"
                    data-test="theme-toggle"
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

    <!-- Mobile: drawer. Its own label, distinct from the desktop nav's, so the two landmarks can be told apart. -->
    <v-navigation-drawer
        :id="DRAWER_ID"
        v-model="drawer"
        temporary
        :aria-label="t('navigation.label-drawer')"
        @keydown.esc="drawer = false"
    >
        <!--
            `role="presentation"`: Vuetify gives the list `role="list"`, whose only permitted
            children are list items — and these are links (axe `aria-required-children`). The
            `<nav>` around them is the landmark; the list is layout.

            Every section the visitor can see, each under its heading, in the order the kernel
            lists them; a section with nothing visible shows no heading either.
        -->
        <v-list nav role="presentation" :aria-label="t('navigation.label-drawer')">
            <template v-for="section in NAVIGATION_SECTIONS" :key="section">
                <template v-if="visibleSections[section].length > 0">
                    <v-list-subheader :data-test="`drawer-section-${section}`">
                        {{ t(`navigation.section-${section}`) }}
                    </v-list-subheader>
                    <v-list-item
                        v-for="item in visibleSections[section]"
                        :key="'drawer-' + item.name"
                        :to="item.to"
                        color="primary"
                        class="capitalize"
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
                </template>
            </template>

            <v-divider class="my-2" />

            <v-list-item
                v-if="!isAuth && hasSignIn"
                color="primary"
                :to="routerLinkI18n(loginContinueTo(route.fullPath))"
            >
                <v-list-item-title>{{ t('navigation.label-login') }}</v-list-item-title>
            </v-list-item>
            <v-list-item
                v-if="!isAuth && hasSignUp"
                color="primary"
                :to="routerLinkI18n({ name: SIGN_UP_ROUTE_NAME })"
            >
                <v-list-item-title>{{ t('navigation.label-signup') }}</v-list-item-title>
            </v-list-item>
            <!--
                `role="button"`: with no `to`, Vuetify renders a `listitem`, which is not a
                permitted child of the presentational list above (axe `aria-required-parent`),
                and logout is an action anyway.
            -->
            <v-list-item v-if="isAuth" role="button" color="primary" @click="logout">
                <template #prepend>
                    <LogOut :size="20" class="mr-3" aria-hidden="true" />
                </template>
                <v-list-item-title>{{ t('navigation.label-logout') }}</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-navigation-drawer>
</template>
