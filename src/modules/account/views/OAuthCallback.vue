<script lang="ts">
export default {
    name: 'OAuthCallbackPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Landing page for the OAuth redirect chain. Any session is already restored by `tryRestoreAuth`
 * in the router's global guard by the time this view mounts — this only decides where to go next:
 * `Home` on success, or a translated explanation with a way back to `/login` when the backend
 * redirected here with `?error=<code>`.
 */
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

/**
 * The closed set of codes the backend redirects with. Anything else — a future code this build
 * predates — falls back to the generic `provider_error` copy rather than showing a raw string.
 */
const KNOWN_ERROR_CODES = ['access_denied', 'email_unverified', 'provider_error'] as const;

/**
 * The translated failure reason, or `undefined` when the login actually succeeded.
 */
const errorMessage = computed(() => {
    const code = route.query.error;
    if (typeof code !== 'string') return undefined;
    const known = (KNOWN_ERROR_CODES as readonly string[]).includes(code)
        ? (code as (typeof KNOWN_ERROR_CODES)[number])
        : 'provider_error';
    return t(`oauth.callback-page.error-${known}`);
});

/**
 * No error at all: the session is already live, so there is nothing to show here — move on to
 * `Home`. The OAuth redirect carries no `?continue=` today, but honouring one if it ever does
 * keeps this in step with `Login.vue`'s own post-login redirect.
 */
onMounted(() => {
    if (errorMessage.value) return;
    const continueTo = route.query.continue;
    void router.push(
        typeof continueTo === 'string' ? { path: continueTo } : routerLinkI18n({ name: 'Home' })
    );
});
</script>

<template>
    <LayoutDefault id="oauth-callback-page" :title="t('oauth.callback-page.page-title')">
        <v-card v-if="errorMessage" class="mx-auto mt-16 w-full max-w-md p-8 text-center">
            <p class="mb-4">{{ errorMessage }}</p>
            <RouterLink :to="routerLinkI18n({ name: 'Login' })" class="text-link hover:underline">
                {{ t('oauth.callback-page.link-back-to-login') }}
            </RouterLink>
        </v-card>
        <div v-else class="mx-auto mt-16 flex w-full max-w-md justify-center p-8">
            <v-progress-circular indeterminate color="primary" />
        </div>
    </LayoutDefault>
</template>
