<template>
    <LayoutDefault id="password-reset-request-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('password-reset-request-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form ref="formElement" class="theme-form" @submit.prevent="submitForm">
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
            <div class="password-reset-request-page-actions">
                <RouterLink :to="routerLinkI18n({ name: 'Login' })" class="theme-button">
                    {{ t('password-reset-request-page.button-go-to-login') }}
                </RouterLink>
            </div>
        </div>
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
import { RouterLink } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
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

<style lang="scss">
#password-reset-request-page {
    .theme-form-container {
        max-width: 420px;
        margin: 100px auto;
        padding: 2rem;
    }

    .password-reset-request-page-actions {
        margin-top: 1rem;
        display: flex;
        justify-content: center;
    }
}
</style>
