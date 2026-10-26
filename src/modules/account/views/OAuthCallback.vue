<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'OAuthCallbackPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Landing page for the OAuth redirect chain (a sign-in, or a signed-in account connecting a
 * provider: `?linked=<provider>`). Any session is already restored by `tryRestoreAuth`
 * in the router's global guard by the time this view mounts — this only decides where to go next:
 * `Home` on a plain success, `TwoFactorChallenge` when the account has 2FA armed
 * (`?mfaRequired=1`), `AccountRestoreChallenge` when the account is in the grace of its own
 * deletion (`?deletionPending=1`), or a translated explanation with a way back to `/login` when the backend
 * redirected here with `?error=<code>`.
 */
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { providerLabel } from '../stores/oauth.ts';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { parseJsonSafe } from '@/infrastructure/utils/safe-storage.ts';
import { useTwoFactorStore } from '../stores/two-factor.ts';
import { useDeletionRestoreStore } from '../stores/deletion-restore.ts';
import { usePostLoginRedirect } from '../composables/use-post-login-redirect.ts';
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
 * Toast dispatcher, used to confirm a provider was connected.
 */
const { addMessage } = useNotificationsStore();

/**
 * Where a plain (non-2FA) success lands — the same `?continue=` handling and saved-locale
 * preference the password login step uses, so OAuth does not skip either .
 */
const { redirectAfterLogin } = usePostLoginRedirect();

/**
 * The closed set of codes the backend redirects with. Anything else — a future code this build
 * predates — falls back to the generic `provider_error` copy rather than showing a raw string.
 */
const KNOWN_ERROR_CODES = [
    'access_denied',
    'email_unverified',
    'account_unverified',
    'account_exists',
    'already_linked',
    'link_expired',
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

    // A hand-edited or truncated URL leaves `methods` unparseable, or not a list at all.
    const parsedMethods = parseJsonSafe(methods);
    if (!Array.isArray(parsedMethods)) return undefined;
    return {
        expiresAt,
        // The backend wrote this list; its entries are read as the contract's summaries.
        methods: parsedMethods as TwoFactorMethodSummary[],
        ...(typeof defaultMethod === 'string' && { defaultMethod })
    };
});

/**
 * The restore offer's dates, when the callback redirected here with `?deletionPending=1` because
 * the account is in the grace of its own deletion: `account/oauth/config.ts#oauthFrontendDeletionCallbackUrl`
 * on the backend wrote this query string. The claim check itself rides an httpOnly cookie.
 *
 * `undefined` when either date is missing, treated as no offer at all.
 */
const oauthDeletion = computed(() => {
    const { deletionPending, purgeAt, expiresAt } = route.query;
    if (deletionPending !== '1' || typeof purgeAt !== 'string' || typeof expiresAt !== 'string')
        return undefined;
    return { purgeAt, expiresAt };
});

/**
 * Where this lands once there is nothing left to decide: `TwoFactorChallenge` with the challenge
 * handed to its store, `Home`/`?continue=` on a plain success, or nowhere at all on an error — the
 * card stays up for the visitor to read.
 */
onMounted(() => {
    if (errorMessage.value) return;

    // A signed-in account just connected a provider (`POST /account/oauth/links/:provider`): no
    // session was minted, none is needed. Say so and go back to where the visitor was.
    if (typeof route.query.linked === 'string') {
        addMessage(
            t('oauth.callback-page.linked', { provider: providerLabel(route.query.linked) })
        );
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- redirectAfterLogin only awaits a router navigation (failures reach router.onError)
        void redirectAfterLogin();
        return;
    }

    if (oauthDeletion.value) {
        useDeletionRestoreStore().beginOAuth(oauthDeletion.value);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- vue-router reports a failed navigation through router.onError (app/router/index.ts)
        void router.push(
            routerLinkI18n({
                name: 'AccountRestoreChallenge',
                query: { continue: route.query.continue }
            })
        );
        return;
    }

    if (oauthChallenge.value) {
        useTwoFactorStore().beginOAuthChallenge(oauthChallenge.value);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- vue-router reports a failed navigation through router.onError (app/router/index.ts)
        void router.push(
            routerLinkI18n({
                name: 'TwoFactorChallenge',
                query: { continue: route.query.continue }
            })
        );
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- redirectAfterLogin only awaits a router navigation (failures reach router.onError)
    void redirectAfterLogin();
});
</script>

<template>
    <div id="oauth-callback-page">
        <v-card v-if="errorMessage" class="mx-auto mt-16 w-full max-w-md p-8 text-center">
            <p class="mb-4">{{ errorMessage }}</p>
            <RouterLink :to="routerLinkI18n({ name: 'Login' })" class="text-link underline">
                {{ t('oauth.callback-page.link-back-to-login') }}
            </RouterLink>
        </v-card>
        <div v-else class="mx-auto mt-16 flex w-full max-w-md justify-center p-8">
            <v-progress-circular indeterminate color="primary" />
        </div>
    </div>
</template>
