<template>
    <LayoutDefault id="password-reset-confirm-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('password-reset-confirm-page.page-title') }}</span>
            </h1>
        </template>

        <VCard class="mx-auto my-16 pa-6" max-width="480" elevation="2">
            <form ref="formElement" class="d-flex flex-column ga-4" @submit.prevent="submitForm">
                <BaseInput
                    v-model="form.token"
                    :label="t('password-reset-confirm-page.label-token')"
                    :errors="formErrors.token"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.password"
                    type="password"
                    :label="t('password-reset-confirm-page.label-password')"
                    :errors="formErrors.password"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.passwordConfirm"
                    type="password"
                    :label="t('password-reset-confirm-page.label-password-confirm')"
                    :errors="formErrors.passwordConfirm"
                    :show-errors="showErrors"
                />
                <BaseButton type="submit" :disabled="isSubmitting">
                    {{ t('password-reset-confirm-page.button-submit') }}
                </BaseButton>
            </form>

            <VDivider class="my-4" />
            <VCardActions class="justify-center pa-0">
                <VBtn :to="routerLinkI18n({ name: 'Login' })" variant="text" color="primary">
                    {{ t('password-reset-confirm-page.button-go-to-login') }}
                </VBtn>
            </VCardActions>
        </VCard>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'PasswordResetConfirmPage'
};
</script>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { VBtn, VCard, VCardActions, VDivider } from 'vuetify/components';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { useProfileStore } from '@/stores/profile.ts';
import { useUsersStore } from '@/features/users/store.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { focusFirstErrorField } from '@/utils/forms.ts';
import { routerLinkI18n } from '@/utils/i18n.ts';

interface IPasswordResetConfirmForm {
    token?: string;
    password?: string;
    passwordConfirm?: string;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { addMessage } = useNotificationsStore();
const { confirmPasswordReset } = useProfileStore();
const { zodSchemaUsersPassword } = useUsersStore();

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IPasswordResetConfirmForm>(
        {
            token: typeof route.query.token === 'string' ? route.query.token : '',
            password: '',
            passwordConfirm: ''
        },
        z
            .object({
                token: z.string().min(1, t('password-reset-confirm-page.token-required')),
                password: zodSchemaUsersPassword,
                passwordConfirm: z.string().min(8, t('users-form.password-confirm-required'))
            })
            .refine((data) => data.password === data.passwordConfirm, {
                message: t('users-form.password-dont-match'),
                path: ['passwordConfirm']
            })
    );

const showErrors = ref(false);
const formElement = ref<HTMLFormElement>();

const submitForm = () =>
    handleSubmit(async () => {
        await confirmPasswordReset(
            form.value.token!,
            form.value.password!,
            form.value.passwordConfirm!
        );
        addMessage(t('password-reset-confirm-page.success'));
        showErrors.value = false;
        await router.push(routerLinkI18n({ name: 'Login' }));
    })
        .then(async (success) => {
            if (success) return;
            showErrors.value = true;
            addMessage(t('users-form.fix-errors'));
            await nextTick();
            focusFirstErrorField(formElement.value);
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
</script>
