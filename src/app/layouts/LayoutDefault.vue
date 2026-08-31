<script setup lang="ts">
/**
 * @module
 * The one page shell every view renders through: skip link, health banner, nav, page hero,
 * footer, confirmation dialog host, toast stack and loading indicators. Preloads nothing
 * domain-specific — see the note near the end of this block.
 */
import { onMounted, useSlots, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useLocale } from 'vuetify';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import AppNavigation from '@/app/components/AppNavigation.vue';
import AppHealthBanner from '@/app/components/AppHealthBanner.vue';
import DialogHost from '@/ui/organisms/DialogHost.vue';
import { useCoreStore, useNotificationsStore } from '@guebbit/vue-toolkit';
import { consumeMainFocus, MAIN_CONTENT } from '@/app/router/announcer.ts';

/**
 * Attrs fall through to `<v-main>` explicitly (`v-bind="$attrs"`), not to the root
 * `<v-app>` — see the `data-main-content` note in the template.
 */
defineOptions({ inheritAttrs: false });

/**
 * Component props — see each field's own doc comment below.
 */
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

/**
 * A page change asked the router for focus on `<v-main>`; this layout is the one that has it.
 */
onMounted(consumeMainFocus);

/**
 * The skip link, by hand: a bare `href` is a hash navigation to the router, which
 * does not move focus — and focus is the whole point of the link.
 */
const skipToContent = () =>
    document.querySelector<HTMLElement>(MAIN_CONTENT)?.focus({ preventScroll: false });

/**
 * Translation function and the active locale, the latter watched below to keep Vuetify in sync.
 */
const { t, locale } = useI18n();

/**
 * Keep Vuetify's internal strings (data-table, pagination, aria-labels…)
 * in sync with the app locale.
 *
 * Explicitly `en` for a language Vuetify has no messages for — a locale the API added at runtime,
 * say. Vuetify does fall back on its own, but only per key and with a console warning for each,
 * and pointing `current` at a locale it does not know leaves its `aria-label`s half-resolved.
 * Saying so here keeps the fallback a decision rather than a side effect.
 */
const { current: vuetifyLocale, messages: vuetifyMessages } = useLocale();

/**
 * Applies the fallback rule above whenever the app locale changes, and once immediately
 * on mount so the very first render is already in sync.
 */
watch(
    locale,
    (newLocale) => {
        vuetifyLocale.value = newLocale in vuetifyMessages.value ? newLocale : 'en';
    },
    { immediate: true } // run the callback once on mount, not just on future changes
);

/**
 * The shop's prose pages, cross-linked from the footer so a `contentinfo` landmark exists on every
 * page. Same four the router declares; the names are computed the same way.
 */
const legalLinks = (['about', 'faq', 'terms', 'privacy'] as const).map((page) => ({
    page,
    to: routerLinkI18n({ name: 'Static' + page[0].toUpperCase() + page.slice(1) })
}));

/**
 * core loading
 */
const { loadings, isLoading } = storeToRefs(useCoreStore());

/**
 * Reactive toast queue, rendered below as one `v-alert` per visible message.
 */
const { messages } = storeToRefs(useNotificationsStore());

/**
 * Dismisses a toast by id, wired to each alert's close button.
 */
const { hideMessage } = useNotificationsStore();

/**
 * Coerces free-form message types into what `v-alert` accepts.
 *
 * @param type - Type carried by the notification, possibly unset or unknown.
 * @returns The matching alert type, or `'info'` as a neutral fallback.
 */
const normalizeAlertType = (type?: string): 'success' | 'info' | 'warning' | 'error' =>
    type === 'success' || type === 'warning' || type === 'error' ? type : 'info';

/*
 * The layout preloads nothing.
 *
 * The session's `viewer` projection is loaded by `tryRestoreAuth` on the very first navigation,
 * before any component mounts, so the shell already has what it needs to render a name — and the
 * *editable* user record is fetched by the account module's own view, when someone actually opens
 * it. Fetching it here would cost a request on every page load for a signed-in visitor, and would
 * be the one reason for the app shell to know what a `User` is.
 */
</script>

<template>
    <v-app>
        <!--
            Skip link (WCAG 2.4.1): the first focusable thing on every page, visible only while it
            has focus — see `.skip-link` in main.css. Lands on `<v-main>` below, which is focusable
            for exactly this reason.
        -->
        <a href="#main" class="skip-link" @click.prevent="skipToContent">{{
            t('navigation.skip-to-content')
        }}</a>

        <AppHealthBanner />
        <AppNavigation>
            <slot name="navigation" />
        </AppNavigation>

        <!--
            `tabindex="-1"` makes the main region focusable by script and the skip link without
            adding it to the tab order; the router moves focus here after every page change.
        -->
        <!--
            `data-main-content`, not an id: the view's own id arrives through `$attrs`
            (`id="cart-page"`) and would replace one — which is how the skip link once pointed at
            nothing on most pages.
        -->
        <v-main v-bind="$attrs" tabindex="-1" data-main-content>
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

        <!--
            Minimal footer, so every page has a `contentinfo` landmark to jump to. The links are
            the same four prose pages the About page cross-links; nothing else belongs here.
        -->
        <v-footer tag="footer" border="t" class="justify-center py-4 text-sm">
            <nav
                class="flex flex-wrap justify-center gap-4"
                :aria-label="t('navigation.label-legal')"
            >
                <RouterLink
                    v-for="link in legalLinks"
                    :key="'footer-' + link.page"
                    class="underline opacity-80"
                    :to="link.to"
                >
                    {{ t(`static-pages.${link.page}.title`) }}
                </RouterLink>
            </nav>
        </v-footer>

        <!-- The one confirmation dialog, fed by `useDialogStore().confirm(...)` -->
        <DialogHost />

        <!--
            Toast stack. The wrapper is a named region, NOT a live region: each alert announces
            itself — `alert` for an error, which interrupts, `status` for the rest, which waits.
            A single `aria-live` wrapper would read every toast at the same urgency and, because a
            hidden node is still in the DOM, would announce nothing when one was shown again.
            `v-if` rather than `v-show` for the same reason: a re-shown alert has to be re-inserted
            to be re-announced.
        -->
        <div
            class="fixed bottom-4 right-4 z-[9999] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
            role="region"
            :aria-label="t('generic.notifications')"
        >
            <template v-for="alert in messages" :key="'alert-' + alert.id">
                <v-alert
                    v-if="alert.visible"
                    :role="alert.type === 'error' ? 'alert' : 'status'"
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
                data-test="activity-indicator"
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
