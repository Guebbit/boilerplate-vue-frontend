<script lang="ts">
export default {
    name: 'ProfilePasswordChange'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Collapsible live-password-change form: a zod schema built once (with a `superRefine` for the
 * confirm-match check) feeds `useAppForm`, and the toggle keeps the profile page from opening
 * with three forms visible at once.
 */
import { ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { usersPasswordSchema } from '@/modules/users';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * The live password change: proves the current password, no email round-trip — unlike the reset
 * flow. Collapsed behind a toggle so the profile page does not open with three forms visible at
 * once.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { changePassword } = useProfileStore();

/**
 * Whether the form below is open. While it is, its errors show instantly.
 */
const showChangePassword = ref(false);

/**
 * The form's id, for the toggle's `aria-controls`.
 */
const passwordFormId = useId();

const passwordFormElement = ref<HTMLFormElement>();

const {
    form: passwordForm,
    formErrors: passwordErrors,
    showFormErrors: showPasswordErrors,
    handleSubmit: handlePasswordSubmit
} = useAppForm(
    {
        currentPassword: '',
        password: '',
        passwordConfirm: ''
    },
    z
        .object({
            currentPassword: z
                .string()
                .min(1, { error: () => t('profile-page.current-password-required') }),
            password: usersPasswordSchema,
            passwordConfirm: z
                .string()
                .min(1, { error: () => t('users-form.password-confirm-required') })
        })
        // `superRefine` runs at parse time, so this `t()` is already lazy and needs no thunk
        .superRefine(({ passwordConfirm, password }, ctx) => {
            if (passwordConfirm !== password)
                ctx.addIssue({
                    code: 'custom',
                    message: t('users-form.password-dont-match'),
                    path: ['passwordConfirm']
                });
        }),
    { formElement: passwordFormElement }
);

/**
 * Submits the password change — the current password is the proof, so a wrong one comes back
 * as a validation error from the API rather than a silent success.
 *
 * @returns A promise resolving once the change settles, reported as a toast.
 */
const submitPasswordChange = () =>
    // `handleSubmit` is the gate: an invalid form shows its messages and focuses the first one
    // rather than sitting behind a button that cannot be pressed.
    handlePasswordSubmit(({ currentPassword, password, passwordConfirm }) =>
        changePassword(currentPassword, password, passwordConfirm)
            .then(() => {
                addMessage(t('profile-page.success-password-change'));
                passwordForm.value.currentPassword = '';
                passwordForm.value.password = '';
                passwordForm.value.passwordConfirm = '';
                showChangePassword.value = false;
            })
            .catch((error) => notifyErrorMessages(addMessage, error))
    );
</script>

<template>
    <v-divider class="my-6" />

    <v-btn
        variant="tonal"
        color="secondary"
        data-test="toggle-change-password"
        :aria-expanded="showChangePassword ? 'true' : 'false'"
        :aria-controls="passwordFormId"
        @click="showChangePassword = !showChangePassword"
    >
        {{ t('profile-page.button-change-password') }}
    </v-btn>

    <v-expand-transition>
        <form
            v-show="showChangePassword"
            :id="passwordFormId"
            ref="passwordFormElement"
            novalidate
            class="mt-4"
            @submit.prevent="submitPasswordChange"
        >
            <v-text-field
                v-model="passwordForm.currentPassword"
                type="password"
                autocomplete="current-password"
                data-test="current-password"
                :label="t('profile-page.label-current-password')"
                :error-messages="showPasswordErrors ? (passwordErrors.currentPassword ?? []) : []"
                class="mb-2"
            />
            <v-text-field
                v-model="passwordForm.password"
                type="password"
                autocomplete="new-password"
                data-test="new-password"
                :label="t('profile-page.label-password')"
                :error-messages="showPasswordErrors ? (passwordErrors.password ?? []) : []"
                class="mb-2"
            />
            <v-text-field
                v-model="passwordForm.passwordConfirm"
                type="password"
                autocomplete="new-password"
                data-test="new-password-confirm"
                :label="t('profile-page.label-passwordConfirm')"
                :error-messages="showPasswordErrors ? (passwordErrors.passwordConfirm ?? []) : []"
            />
            <v-btn type="submit" color="primary" class="mt-2" data-test="submit-password-change">
                {{ t('profile-page.button-submit-password') }}
            </v-btn>
        </form>
    </v-expand-transition>
</template>
