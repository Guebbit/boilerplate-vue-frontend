<script lang="ts">
export default {
    name: 'LoginPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Login form: email/password validated against a schema built from the shared `usersSchema`. A
 * plain account redirects through `usePostLoginRedirect`; an account with two-factor armed hands
 * the challenge to `useTwoFactorStore` and pushes `TwoFactorChallenge` instead — see the store's
 * `LoginOutcome` for the branch this reads.
 */
import { ref } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-vue-next';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { useTwoFactorStore } from '@/modules/account/stores/two-factor.ts';
import {
    useOAuthProvidersStore,
    oauthStartUrl,
    providerLabel
} from '@/modules/account/stores/oauth.ts';
import { usePostLoginRedirect } from '@/modules/account/composables/use-post-login-redirect.ts';
import { usersSchema } from '@/modules/users';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import type { LoginRequest } from '@api';

/**
 * UI logics
 */
const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();
const router = useRouter();
const route = useRoute();
const { redirectAfterLogin } = usePostLoginRedirect();

/**
 * Which OAuth providers to offer, fetched once — see the store's own doc for why a later mount
 * of this view is a no-op rather than a second request.
 */
const { providers: oauthProviders } = storeToRefs(useOAuthProvidersStore());
void useOAuthProvidersStore().fetchProviders();

/**
 * Form logics.
 *
 * Login only needs the email rule from the shared user schema, plus a password presence check.
 * Built once: its messages are thunks, so it already speaks the active language at parse time
 * (see `@/modules/users/schemas.ts`). `revalidateOn` is what re-translates an error already on
 * screen, which no schema shape can do — `formErrors` holds resolved strings by then.
 */
const loginSchema = usersSchema.pick({ email: true }).extend({
    password: z.string().min(8, { error: () => t('users-form.password-required') })
});

/**
 * Whether the password field shows its plaintext.
 */
const showPassword = ref(false);

const formElement = ref<HTMLFormElement>();

const {
    form,
    formErrors,
    showFormErrors: showErrors,
    handleSubmit,
    applyServerErrors
} = useStructureFormValidation<
    // The contract's `remember` is a tier; the form's is the checkbox the store maps to one.
    Omit<LoginRequest, 'remember'> & {
        remember?: boolean;
    }
>(
    {
        email: '',
        password: '',
        remember: false
    },
    loginSchema,
    {
        formElement,
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * Validates the form and authenticates the user.
 *
 * @returns A promise resolving once the outcome settles: a plain session redirects (see
 *  `usePostLoginRedirect`); an account with 2FA armed hands the challenge to the two-factor store
 *  and pushes `TwoFactorChallenge` instead. Invalid input is revealed, announced and focused by
 *  the toolkit before the handler is ever reached; API failures are attached to the field the
 *  server named, or reported as a toast when it named none.
 */
const submitForm = () =>
    handleSubmit(() =>
        useAuthStore()
            .login(form.value.email, form.value.password, form.value.remember)
            .then((outcome) => {
                if (outcome?.kind === 'mfa') {
                    useTwoFactorStore().beginLoginChallenge(outcome, form.value.remember ?? false);
                    return router.push(
                        routerLinkI18n({ name: 'TwoFactorChallenge', query: route.query })
                    );
                }
                return redirectAfterLogin();
            })
            // Discard the NavigationFailure: handleSubmit's handler resolves with nothing
            .then(() => undefined)
    ).catch((error) => {
        // A 401 names no field, so it stays a toast. A 422 that names `email` lands under it.
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });
</script>

<template>
    <LayoutDefault id="login-page" :title="t('login-page.page-title')">
        <v-card class="mx-auto mt-16 w-full max-w-md p-8">
            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    :label="t('login-page.label-email')"
                    :error-messages="showErrors ? formErrors.email : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    :label="t('login-page.label-password')"
                    :error-messages="showErrors ? formErrors.password : []"
                >
                    <template #append-inner>
                        <v-btn
                            icon
                            variant="text"
                            size="small"
                            :aria-label="t('login-page.label-toggle-password')"
                            @click="showPassword = !showPassword"
                        >
                            <EyeOff v-if="showPassword" :size="18" aria-hidden="true" />
                            <Eye v-else :size="18" aria-hidden="true" />
                        </v-btn>
                    </template>
                </v-text-field>
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <v-checkbox
                        v-model="form.remember"
                        :label="t('login-page.label-remember')"
                        hide-details
                        density="compact"
                    />
                    <RouterLink
                        :to="routerLinkI18n({ name: 'PasswordResetRequest' })"
                        class="text-sm text-link hover:underline"
                    >
                        {{ t('login-page.link-password-reset') }}
                    </RouterLink>
                </div>
                <v-btn type="submit" color="primary" size="large" block class="mt-4">
                    {{ t('login-page.button-submit') }}
                </v-btn>
            </form>
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
                    :href="oauthStartUrl(provider)"
                    variant="outlined"
                    size="large"
                    block
                    class="mb-2"
                >
                    {{ t('oauth.continue-with', { provider: providerLabel(provider) }) }}
                </v-btn>
            </template>
        </v-card>
    </LayoutDefault>
</template>
