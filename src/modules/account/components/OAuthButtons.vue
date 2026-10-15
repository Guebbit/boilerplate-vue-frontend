<script setup lang="ts">
/**
 * @module
 * The "Continue with <provider>" block shared by Login and Signup: a divider, one button per
 * enabled provider, and the sign-in-wrap notice. A first sign-in with a provider creates the
 * account, so the notice beside the buttons is where the terms are put in front of the visitor
 * (the backend stamps the acceptance when it creates that account). Renders nothing when no
 * provider is enabled.
 */
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useOAuthProvidersStore, oauthStartUrl, providerLabel } from '../stores/oauth.ts';
import { isSameOriginPath } from '../composables/use-post-login-redirect.ts';
import { routerLinkI18n } from '@/i18n/router-link.ts';

const { t, locale } = useI18n();

/** Current route, read for its `?continue=` — forwarded onto the OAuth start URL. */
const route = useRoute();

/**
 * Which OAuth providers to offer, fetched once — see the store's own doc for why a later mount
 * of this block is a no-op rather than a second request.
 */
const { providers: oauthProviders } = storeToRefs(useOAuthProvidersStore());
void useOAuthProvidersStore().fetchProviders();

/**
 * The same-origin `?continue=` this page arrived with, if any — forwarded onto the OAuth start
 * URL so the round trip through the provider ends where a plain login would have.
 */
const continueTo = computed(() =>
    isSameOriginPath(route.query.continue) ? route.query.continue : undefined
);
</script>

<template>
    <template v-if="oauthProviders.length > 0">
        <div class="my-4 flex items-center gap-3 text-xs uppercase opacity-70">
            <v-divider />
            {{ t('oauth.divider') }}
            <v-divider />
        </div>
        <!-- A real `<a href>` via v-btn's `href` prop: the redirect dance needs a genuine
             top-level navigation, which a RouterLink or a click handler cannot provide. -->
        <v-btn
            v-for="provider in oauthProviders"
            :key="provider"
            :data-test="`oauth-${provider}`"
            :href="oauthStartUrl(provider, { continueTo, locale })"
            variant="outlined"
            size="large"
            block
            class="mb-2"
        >
            {{ t('oauth.continue-with', { provider: providerLabel(provider) }) }}
        </v-btn>
        <i18n-t
            keypath="oauth.text-terms-notice"
            tag="p"
            class="mt-2 text-xs opacity-70"
            data-test="oauth-terms-notice"
        >
            <template #terms>
                <RouterLink :to="routerLinkI18n({ name: 'StaticTerms' })" class="underline">
                    {{ t('static-pages.terms.title') }}
                </RouterLink>
            </template>
            <template #privacy>
                <RouterLink :to="routerLinkI18n({ name: 'StaticPrivacy' })" class="underline">
                    {{ t('static-pages.privacy.title') }}
                </RouterLink>
            </template>
        </i18n-t>
    </template>
</template>
