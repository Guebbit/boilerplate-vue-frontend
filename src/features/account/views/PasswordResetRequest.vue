<template>
    <LayoutDefault id="password-reset-request-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('password-reset-request-page.page-title') }}</span>
            </h1>
        </template>

        <VCard class="mx-auto my-16 pa-6" max-width="480" elevation="2">
            <form ref="formElement" class="d-flex flex-column ga-4" @submit.prevent="submitForm">
                <BaseInput
                    v-model="form.email"
                    type="email"
                    :label="t('password-reset-request-page.label-email')"
                    :errors="formErrors.email"
                    :show-errors="showErrors"
                />
                <BaseButton type="submit" :disabled="isSubmitting">
                    {{ t('password-reset-request-page.button-submit') }}
                </BaseButton>
            </form>
            <VDivider class="my-4" />
            <VCardActions class="justify-center pa-0">
                <VBtn :to="routerLinkI18n({ name: 'Login' })" variant="text" color="primary">
                    {{ t('password-reset-request-page.button-go-to-login') }}
                </VBtn>
            </VCardActions>
        </VCard>
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

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { requestPasswordReset } = useProfileStore();
const { zodSchemaUsers } = useUsersStore();

const { form, formErrors, isSubmitting, handleSubmit } = useStructureFormValidation<{
    email?: string;
}>({ email: '' }, zodSchemaUsers.pick({ email: true }));

const showErrors = ref(false);
const formElement = ref<HTMLFormElement>();

const submitForm = () =>
    handleSubmit(async () => {
        await requestPasswordReset(form.value.email!);
        addMessage(t('password-reset-request-page.success'));
        showErrors.value = false;
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
