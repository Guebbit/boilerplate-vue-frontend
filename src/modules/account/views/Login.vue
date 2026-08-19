<script lang="ts">
export default {
    name: 'LoginPage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-vue-next';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useAccountStore } from '@/modules/account/store.ts';
import { usersSchema } from '@/modules/users';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { changeLanguage, supportedLanguages } from '@/infrastructure/i18n';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import type { LoginRequest } from '@api';

/**
 * UI logics
 */
const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();
const router = useRouter();
const route = useRoute();

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

const showPassword = ref(false);
const formElement = ref<HTMLFormElement>();

const {
    form,
    formErrors,
    showFormErrors: showErrors,
    handleSubmit,
    applyServerErrors
} = useStructureFormValidation<
    LoginRequest & {
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
        revalidateOn: locale,
        // The toolkit reveals the errors, waits for the render and focuses the first invalid
        // field; all this form supplies is where to look and what to say.
        formElement,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('users-form.fix-errors'))
    }
);

/**
 * Validates the form and authenticates the user.
 *
 * @returns A promise resolving once the navigation settles: to the
 *  `?continue=` target when present, to `Home` otherwise. Invalid input is revealed, announced
 *  and focused by the toolkit before the handler is ever reached; API failures are attached to
 *  the field the server named, or reported as a toast when it named none.
 */
const submitForm = () => {
    const accountStore = useAccountStore();
    return handleSubmit(() =>
        accountStore
            .login(form.value.email, form.value.password)
            .then(() => {
                /*
                 * The record's language wins over the tab's: the saved preference is what this
                 * visitor asked to read, and login is the moment their record joins the session.
                 * A `?continue=` deep link keeps its own locale — the page it names wins — and a
                 * record with no preference (or one this build does not speak) changes nothing.
                 */
                const saved = accountStore.profile?.locale;
                const applyPreference =
                    !route.query.continue &&
                    typeof saved === 'string' &&
                    saved !== locale.value &&
                    supportedLanguages.includes(saved)
                        ? changeLanguage(saved)
                        : Promise.resolve();
                return applyPreference.then(() =>
                    // if query continue was set, redirect to that page, otherwise redirect to
                    // home — under whichever locale is active by now
                    route.query.continue
                        ? router.push({ path: route.query.continue as string })
                        : router.push(routerLinkI18n({ name: 'Home' }))
                );
            })
            // Discard the NavigationFailure: handleSubmit's handler resolves with nothing
            .then(() => undefined)
    ).catch((error) => {
        // A 401 names no field, so it stays a toast. A 422 that names `email` lands under it.
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });
};
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
        </v-card>
    </LayoutDefault>
</template>
