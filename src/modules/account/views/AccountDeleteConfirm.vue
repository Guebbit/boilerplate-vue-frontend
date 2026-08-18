<script lang="ts">
export default {
    name: 'AccountDeleteConfirmPage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useAccountStore } from '@/modules/account/store.ts';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/routerLink.ts';

/**
 * Form state: only the one-time token, prefilled from the email link.
 */
interface AccountDeleteConfirmForm {
    token?: string;
}

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { addMessage } = useNotificationsStore();
const { confirmAccountDelete } = useAccountStore();

const formElement = ref<HTMLFormElement>();

const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useStructureFormValidation<AccountDeleteConfirmForm>(
    {
        token: typeof route.query.token === 'string' ? route.query.token : ''
    },
    z.object({
        token: z.string().min(1, { error: () => t('account-delete-confirm-page.token-required') })
    }),
    {
        revalidateOn: locale,
        formElement,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('users-form.fix-errors'))
    }
);

/**
 * Validates the token and deletes the account for good.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the user is sent `Home`. Invalid input is revealed, announced and focused by the
 *  toolkit before the handler runs; API failures land on the field the server named, or as a toast.
 */
const submitForm = () =>
    handleSubmit(() =>
        confirmAccountDelete(form.value.token!)
            .then(() => {
                addMessage(t('account-delete-confirm-page.success'));
                return router.push(routerLinkI18n({ name: 'Home' }));
            })
            .then(() => {
                // Swallows `router.push`'s resolved value: it is a
                // `NavigationFailure | undefined`, which the submit handler's `Promise<void>`
                // will not take, and a failed navigation is the router's own `onError` to
                // report rather than this form's.
            })
    ).catch((error) => {
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });
</script>

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
