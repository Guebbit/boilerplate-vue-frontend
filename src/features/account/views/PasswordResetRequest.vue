<template>
    <LayoutDefault
        id="password-reset-request-page"
        :title="t('password-reset-request-page.page-title')"
    >
        <v-card class="mx-auto mt-16 w-full max-w-md p-8">
            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    :label="t('password-reset-request-page.label-email')"
                    :error-messages="showErrors ? formErrors.email : []"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="isSubmitting"
                    class="mt-4"
                >
                    {{ t('password-reset-request-page.button-submit') }}
                </v-btn>
            </form>
            <div class="mt-4 flex justify-center">
                <v-btn variant="text" :to="routerLinkI18n({ name: 'Login' })">
                    {{ t('password-reset-request-page.button-go-to-login') }}
                </v-btn>
            </div>
        </v-card>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'PasswordResetRequestPage'
};
</script>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { useProfileStore } from '@/stores/profile.ts';
import { usersSchema } from '@/features/users';
import { notifyErrorMessages, focusFirstErrorField } from '@/utils/errors.ts';
import { routerLinkI18n } from '@/utils/i18n.ts';

const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();
const { requestPasswordReset } = useProfileStore();

const { form, formErrors, isSubmitting, handleSubmit } = useStructureFormValidation<{
    email?: string;
}>({ email: '' }, usersSchema.pick({ email: true }), { revalidateOn: locale });

const showErrors = ref(false);
const formElement = ref<HTMLFormElement>();

/**
 * Validates the email and asks the backend for a reset token.
 *
 * @returns A promise resolving once the flow settles: on success a toast
 *  confirms the email was sent; on invalid input the errors are revealed and the
 *  field focused; API failures are reported as toasts.
 */
const submitForm = () =>
    handleSubmit(() =>
        requestPasswordReset(form.value.email!).then(() => {
            addMessage(t('password-reset-request-page.success'));
            showErrors.value = false;
        })
    )
        .then((success) => {
            if (success) return;
            showErrors.value = true;
            addMessage(t('users-form.fix-errors'));
            // After nextTick so the messages `showErrors` just revealed are in the DOM —
            // `focusFirstErrorField` looks for them.
            return nextTick().then(() => focusFirstErrorField(formElement.value));
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
</script>
