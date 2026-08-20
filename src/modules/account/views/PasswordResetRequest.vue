<script lang="ts">
export default {
    name: 'PasswordResetRequestPage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useAccountStore } from '@/modules/account/store.ts';
import { usersSchema } from '@/modules/users';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { requestPasswordReset } = useAccountStore();

const formElement = ref<HTMLFormElement>();

const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useAppForm<{
    email?: string;
}>({ email: '' }, usersSchema.pick({ email: true }), { formElement });

/**
 * Validates the email and asks the backend for a reset token.
 *
 * @returns A promise resolving once the flow settles: on success a toast
 *  confirms the email was sent. Invalid input is revealed, announced and focused by the toolkit
 *  before the handler runs; API failures land on the field the server named, or as a toast.
 */
const submitForm = () =>
    handleSubmit(() =>
        requestPasswordReset(form.value.email!).then(() => {
            addMessage(t('password-reset-request-page.success'));
        })
    ).catch((error) => {
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });
</script>

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
