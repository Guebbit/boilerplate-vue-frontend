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
 * `Home` on a plain success, `TwoFactorChallenge` when the account has 2FA armed
 * (`?mfaRequired=1`), or a translated explanation with a way back to `/login` when the backend
 * redirected here with `?error=<code>`.
 */
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useTwoFactorStore } from '@/modules/account/stores/two-factor.ts';
import type { TwoFactorMethodSummary } from '@api';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Current route, read for its params, query and name.
 */
const route = useRoute();

/**
 * Router instance, for the navigations this file performs.
 */
const router = useRouter();

/**
 * The closed set of codes the backend redirects with. Anything else — a future code this build
 * predates — falls back to the generic `provider_error` copy rather than showing a raw string.
 */
const KNOWN_ERROR_CODES = [
    'access_denied',
    'email_unverified',
    'account_unverified',
    'provider_error'
] as const;

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
 * The 2FA step's own metadata, when the callback redirected here with `?mfaRequired=1` instead of
 * a session — `account/oauth/config.ts#oauthFrontendMfaCallbackUrl` on the backend is what wrote
 * this query string. The challenge TOKEN itself is never in it: that travels in an httpOnly
 * cookie only the backend reads, one `POST /account/login/2fa[/send]` on `TwoFactorChallenge` can
 * submit with no token of its own — see `stores/two-factor.ts#beginOAuthChallenge`.
 *
 * `undefined` on anything unparseable, treated the same as no challenge at all: a malformed
 * `methods` here means the redirect itself is broken, not something this view can recover from.
 */
const oauthChallenge = computed(() => {
    const { mfaRequired, expiresAt, methods, defaultMethod } = route.query;
    if (mfaRequired !== '1' || typeof expiresAt !== 'string' || typeof methods !== 'string')
        return undefined;

    // JSON.parse throws on malformed input, with no non-throwing form — a hand-edited or
    // truncated URL is exactly the "no safe wrapper" case this rule carves out.
    // eslint-disable-next-line no-restricted-syntax -- containing JSON.parse's throw on a malformed `methods` query param, which has no non-throwing form
    try {
        return {
            expiresAt,
            methods: JSON.parse(methods) as TwoFactorMethodSummary[],
            ...(typeof defaultMethod === 'string' && { defaultMethod })
        };
    } catch {
        return undefined;
    }
});

/**
 * Where this lands once there is nothing left to decide: `TwoFactorChallenge` with the challenge
 * handed to its store, `Home`/`?continue=` on a plain success, or nowhere at all on an error — the
 * card stays up for the visitor to read.
 */
onMounted(() => {
    if (errorMessage.value) return;

    if (oauthChallenge.value) {
        useTwoFactorStore().beginOAuthChallenge(oauthChallenge.value);
        void router.push(
            routerLinkI18n({
                name: 'TwoFactorChallenge',
                query: { continue: route.query.continue }
            })
        );
        return;
    }

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
