<template>
    <LayoutDefault id="account-delete-confirm-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('account-delete-confirm-page.page-title') }}</span>
            </h1>
        </template>

        <VCard class="mx-auto my-16 pa-6" max-width="480" elevation="2">
            <VAlert color="warning" icon="$alert" variant="tonal" class="mb-6">
                {{ t('account-delete-confirm-page.warning-message') }}
            </VAlert>

            <form ref="formElement" class="d-flex flex-column ga-4" @submit.prevent="submitForm">
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

            <VDivider class="my-4" />
            <VCardActions class="justify-center pa-0">
                <VBtn :to="routerLinkI18n({ name: 'Profile' })" variant="text" color="primary">
                    {{ t('account-delete-confirm-page.button-go-back') }}
                </VBtn>
            </VCardActions>
        </VCard>
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
import { useRoute, useRouter } from 'vue-router';
import { VAlert, VBtn, VCard, VCardActions, VDivider } from 'vuetify/components';
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
