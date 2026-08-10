<script lang="ts">
export default {
    name: 'LoginPage'
};
</script>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-vue-next';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { usersSchema } from '@/features/users/schemas.ts';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { notifyErrorMessages, focusFirstErrorField } from '@/utils/errors.ts';
import { routerLinkI18n } from '@/utils/i18n.ts';
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
 * (see `@/features/users/schemas.ts`). `revalidateOn` is what re-translates an error already on
 * screen, which no schema shape can do — `formErrors` holds resolved strings by then.
 */
const loginSchema = usersSchema.pick({ email: true }).extend({
    password: z.string().min(8, { error: () => t('users-form.password-required') })
});

const { form, formErrors, validate } = useStructureFormValidation<
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
    { revalidateOn: locale }
);

const showErrors = ref(false);
const showPassword = ref(false);
const formElement = ref<HTMLFormElement>();

/**
 * When the mock API is active, prefill the dummy user of the mock database
 */
if (import.meta.env.VITE_API_MOCK_ENABLED === 'true')
    form.value = {
        email: 'root@root.it',
        password: 'rootroot'
    };

/**
 * Validates the form and authenticates the user.
 *
 * @returns A promise resolving once the navigation settles: to the
 *  `?continue=` target when present, to `Home` otherwise. On invalid input it
 *  resolves early, showing the errors and focusing the first invalid field; API
 *  failures are reported as toasts.
 */
const submitForm = () => {
    const { login } = useProfileStore();
    if (!validate()) {
        showErrors.value = true;
        addMessage(t('users-form.fix-errors'));
        // After nextTick so the messages `showErrors` just revealed are in the DOM —
        // `focusFirstErrorField` looks for them.
        return nextTick().then(() => focusFirstErrorField(formElement.value));
    }
    return login(form.value.email!, form.value.password!)
        .then(() =>
            // if query continue was set, redirect to that page, otherwise redirect to home
            route.query.continue
                ? router.push({ path: route.query.continue as string })
                : router.push({ name: 'Home' })
        )
        .catch((error) => notifyErrorMessages(addMessage, error));
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
