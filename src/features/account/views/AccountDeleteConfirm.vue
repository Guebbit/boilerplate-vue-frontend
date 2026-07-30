<template>
    <LayoutDefault
        id="account-delete-confirm-page"
        :title="t('account-delete-confirm-page.page-title')"
    >
        <v-card class="mx-auto mt-16 w-full max-w-md p-8">
            <v-alert type="warning" class="mb-6">
                {{ t('account-delete-confirm-page.warning-message') }}
            </v-alert>

            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.token"
                    :label="t('account-delete-confirm-page.label-token')"
                    :error-messages="showErrors ? formErrors.token : []"
                />
                <v-btn
                    type="submit"
                    color="error"
                    size="large"
                    block
                    :loading="isSubmitting"
                    class="mt-4"
                >
                    {{ t('account-delete-confirm-page.button-submit') }}
                </v-btn>
            </form>

            <div class="mt-4 flex justify-center">
                <v-btn variant="text" :to="routerLinkI18n({ name: 'Profile' })">
                    {{ t('account-delete-confirm-page.button-go-back') }}
                </v-btn>
            </div>
        </v-card>
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
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { useProfileStore } from '@/stores/profile.ts';
import { notifyErrorMessages, focusFirstErrorField } from '@/utils/errors.ts';
import { routerLinkI18n } from '@/utils/i18n.ts';

/**
 * Form state: only the one-time token, prefilled from the email link.
 */
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

/**
 * Validates the token and deletes the account for good.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the user is sent `Home`; on invalid input the errors are revealed
 *  and the field focused; API failures are reported as toasts.
 */
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
