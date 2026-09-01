<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AboutPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The shop's About page. Structure lives here — intro, a "what you can try" feature grid, an
 * "under the hood" stack list, a "take it for a spin" walkthrough with CTAs — and every word
 * lives in the dictionary under `static-pages.about.*`. The feature/stack KEYS are declared in
 * this file (an icon is not translatable) and each key reads its title and text from the
 * dictionary; the CTAs point at module routes, so each is guarded by `router.hasRoute`.
 */
import { computed } from 'vue';
import type { Component } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import {
    ArrowRight,
    CircleUserRound,
    Heart,
    Languages,
    MessageSquare,
    Package,
    ReceiptText,
    ShoppingCart,
    SunMoon
} from 'lucide-vue-next';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import StaticPageLinks from '@/app/components/StaticPageLinks.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { SIGN_UP_ROUTE_NAME } from '@/app/router/navigation.ts';
import { staticPageParagraphs, staticPageRouteName } from '@/app/utils/static-pages.ts';

/**
 * Translation helpers: `t` for plain strings, `tm`/`rt` for the raw paragraph lists resolved by
 * {@link staticPageParagraphs}.
 */
// eslint-disable-next-line @typescript-eslint/unbound-method -- vue-i18n's documented destructuring; the composer binds these itself
const { t, tm, rt } = useI18n();

/**
 * Router instance, asked whether the CTA destinations exist in this build.
 */
const router = useRouter();

/**
 * The features the storefront demonstrates, each a dictionary key under
 * `static-pages.about.features.*` and the glyph that stands for it.
 */
const FEATURES: readonly { key: string; icon: Component }[] = [
    { key: 'catalogue', icon: Package },
    { key: 'wishlist', icon: Heart },
    { key: 'cart', icon: ShoppingCart },
    { key: 'orders', icon: ReceiptText },
    { key: 'account', icon: CircleUserRound },
    { key: 'contact', icon: MessageSquare },
    { key: 'languages', icon: Languages },
    { key: 'theme', icon: SunMoon }
];

/**
 * The layers under the storefront, each a dictionary key under `static-pages.about.stack.*`.
 */
const STACK: readonly string[] = [
    'frontend',
    'api',
    'contract',
    'realtime',
    'quality',
    'observability'
];

/**
 * The opening prose, one string per paragraph.
 */
const intro = computed(() => staticPageParagraphs(tm, rt, 'static-pages.about.intro'));

/**
 * The walkthrough, one string per step.
 */
const steps = computed(() => staticPageParagraphs(tm, rt, 'static-pages.about.try.steps'));

/**
 * Whether the catalogue is part of this build — the first CTA points at it.
 */
const hasProductsList = computed(() => router.hasRoute('ProductsList'));

/**
 * Whether sign-up is part of this build — the second CTA points at it.
 */
const hasSignUp = computed(() => router.hasRoute(SIGN_UP_ROUTE_NAME));
</script>

<template>
    <LayoutDefault id="static-page-about" :title="t('static-pages.about.title')">
        <div class="mx-auto mt-10 grid w-full max-w-4xl gap-8">
            <!-- Intro -->
            <v-card class="p-8">
                <p class="text-lg font-medium">{{ t('static-pages.about.tagline') }}</p>
                <p v-for="(paragraph, index) in intro" :key="'intro-' + index" class="mt-4">
                    {{ paragraph }}
                </p>
            </v-card>

            <!-- What you can try -->
            <section class="grid gap-4" data-test="about-features">
                <h2 class="m-0 text-xl font-semibold">
                    {{ t('static-pages.about.features.title') }}
                </h2>
                <div class="grid gap-4 sm:grid-cols-2">
                    <v-card
                        v-for="feature in FEATURES"
                        :key="'feature-' + feature.key"
                        variant="tonal"
                        class="p-5"
                    >
                        <div class="flex items-start gap-4">
                            <component
                                :is="feature.icon"
                                :size="24"
                                class="mt-0.5 shrink-0 text-primary"
                                aria-hidden="true"
                            />
                            <div>
                                <h3 class="m-0 text-base font-semibold">
                                    {{ t(`static-pages.about.features.${feature.key}.title`) }}
                                </h3>
                                <p class="mt-1 text-sm opacity-80">
                                    {{ t(`static-pages.about.features.${feature.key}.text`) }}
                                </p>
                            </div>
                        </div>
                    </v-card>
                </div>
            </section>

            <!-- Under the hood -->
            <section class="grid gap-4" data-test="about-stack">
                <h2 class="m-0 text-xl font-semibold">
                    {{ t('static-pages.about.stack.title') }}
                </h2>
                <v-card class="p-6">
                    <dl class="grid gap-4 sm:grid-cols-[minmax(10rem,auto)_1fr] sm:gap-x-8">
                        <template v-for="key in STACK" :key="'stack-' + key">
                            <dt class="font-semibold">
                                {{ t(`static-pages.about.stack.${key}.title`) }}
                            </dt>
                            <dd class="m-0 opacity-80">
                                {{ t(`static-pages.about.stack.${key}.text`) }}
                            </dd>
                        </template>
                    </dl>
                </v-card>
            </section>

            <!-- Take it for a spin -->
            <section class="grid gap-4" data-test="about-try">
                <h2 class="m-0 text-xl font-semibold">{{ t('static-pages.about.try.title') }}</h2>
                <v-card class="p-6">
                    <ol class="m-0 grid list-decimal gap-2 pl-6">
                        <li v-for="(step, index) in steps" :key="'step-' + index">{{ step }}</li>
                    </ol>
                    <p class="mt-4 text-sm opacity-80">{{ t('static-pages.about.try.note') }}</p>
                    <div class="mt-6 flex flex-wrap gap-3">
                        <v-btn
                            v-if="hasProductsList"
                            color="primary"
                            :to="routerLinkI18n({ name: 'ProductsList' })"
                        >
                            {{ t('static-pages.about.try.button-products') }}
                            <ArrowRight :size="18" class="ml-2" aria-hidden="true" />
                        </v-btn>
                        <v-btn
                            v-if="hasSignUp"
                            variant="tonal"
                            :to="routerLinkI18n({ name: SIGN_UP_ROUTE_NAME })"
                        >
                            {{ t('static-pages.about.try.button-signup') }}
                        </v-btn>
                        <v-btn
                            variant="text"
                            :to="routerLinkI18n({ name: staticPageRouteName('faq') })"
                        >
                            {{ t('static-pages.about.try.button-faq') }}
                        </v-btn>
                    </div>
                </v-card>
            </section>

            <v-card class="px-8 pb-8 pt-2">
                <StaticPageLinks current="about" />
            </v-card>
        </div>
    </LayoutDefault>
</template>
