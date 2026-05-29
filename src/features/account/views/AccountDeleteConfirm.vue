<template>
    <LayoutDefault id="account-delete-confirm-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('account-delete-confirm-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <p class="account-delete-confirm-page-warning">
                {{ t('account-delete-confirm-page.warning-message') }}
            </p>

            <form ref="formElement" class="theme-form" @submit.prevent="submitForm">
                <BaseInput
                    v-model="form.token"
                    :label="t('account-delete-confirm-page.label-token')"
                    :errors="formErrors.token"
                    :show-errors="showErrors"
                />
                <BaseButton type="submit" :disabled="isSubmitting">
                    {{ t('account-delete-confirm-page.button-submit') }}
                </BaseButton>
            </form>

            <div class="account-delete-confirm-page-actions">
                <RouterLink :to="routerLinkI18n({ name: 'Profile' })" class="theme-button">
                    {{ t('account-delete-confirm-page.button-go-back') }}
                </RouterLink>
            </div>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'AccountDeleteConfirmPage'
};
</script>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { useProfileStore } from '@/stores/profile.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { focusFirstErrorField } from '@/utils/forms.ts';
import { routerLinkI18n } from '@/utils/i18n.ts';

interface IAccountDeleteConfirmForm {
    token?: string;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { addMessage } = useNotificationsStore();
const { confirmAccountDelete } = useProfileStore();

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IAccountDeleteConfirmForm>(
        {
            token: typeof route.query.token === 'string' ? route.query.token : ''
        },
        z.object({
            token: z.string().min(1, t('account-delete-confirm-page.token-required'))
        })
    );

const showErrors = ref(false);
const formElement = ref<HTMLFormElement>();

const submitForm = () =>
    handleSubmit(async () => {
        await confirmAccountDelete(form.value.token!);
        addMessage(t('account-delete-confirm-page.success'));
        showErrors.value = false;
        await router.push(routerLinkI18n({ name: 'Home' }));
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
#account-delete-confirm-page {
    .theme-form-container {
        max-width: 420px;
        margin: 100px auto;
        padding: 2rem;
    }

    .account-delete-confirm-page-warning {
        margin-bottom: 1.5rem;
        padding: 1rem;
        border: 1px solid #e74c3c;
        border-radius: 4px;
        background: rgba(231, 76, 60, 0.05);
        color: #c0392b;
        text-align: center;
        font-weight: 500;
    }

    .account-delete-confirm-page-actions {
        margin-top: 1rem;
        display: flex;
        justify-content: center;
    }
}
</style>
