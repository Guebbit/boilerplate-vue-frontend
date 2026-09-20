<script lang="ts">
export default {
    name: 'VerifyEmailConfirmPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public confirm page for email verification: the token is the credential, and a submit button
 * (rather than firing on mount) keeps a mail scanner that prefetches the link from spending the
 * token before the human arrives.
 */
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/infrastructure/utils/errors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

/**
 * Spends the one-time email-verification token.
 *
 * Public deliberately, like the password-reset confirm: the link arrives by email and the
 * visitor following it is not necessarily signed in — the token is the credential. A submit
 * button rather than an auto-fire on mount, so a mail scanner prefetching the URL cannot spend
 * the token before the human arrives.
 */
interface VerifyEmailConfirmForm {
    token?: string;
}

/**
 * Translation function, and the currently active locale code.
 */
const { t, locale } = useI18n();

/**
 * Current route, read for its params, query and name.
 */
const route = useRoute();

/**
 * Router instance, for the navigations this file performs.
 */
const router = useRouter();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Confirms the address against the emailed token.
 */
const { confirmEmailVerification } = useProfileStore();

/**
 * The `<form>` itself, so `useStructureFormValidation` can focus the first invalid field
 * on submit.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, error surface and submit handler, from the toolkit's form validation.
 */
const { form, formErrors, showFormErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<VerifyEmailConfirmForm>(
        {
            token: typeof route.query.token === 'string' ? route.query.token : ''
        },
        z.object({
            token: z.string().min(1, { error: () => t('verify-email-confirm-page.token-required') })
        }),
        {
            formElement,
            revalidateOn: locale,
            invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
            onInvalid: () => addMessage(t('generic.fix-errors'))
        }
    );

/**
 * This submit's own blocked state — a spent or unknown token names no field, so it lands here
 * instead of a toast, next to the button the visitor just pressed.
 */
const {
    message: confirmError,
    type: confirmErrorType,
    report: reportConfirmError,
    clear: clearConfirmError
} = useBlockingError();

/**
 * Spends the token; success lands on the profile (a live session shows the banner gone) or the
 * login when there is none.
 *
 * @returns A promise resolving once the confirmation settles: success is a toast, a failure
 *  blocks the form in place ({@link confirmError}).
 */
const submitForm = () => {
    clearConfirmError();
    return handleSubmit(() =>
        confirmEmailVerification(form.value.token ?? '')
            .then(() => {
                addMessage(t('verify-email-confirm-page.success'));
                return router.push(routerLinkI18n({ name: 'Home' }));
            })
            // Swallows `router.push`'s resolved value — a failed navigation is the router's own
            // `onError` to report, not this form's. Same note as the reset confirm.
            .then(() => undefined)
    ).catch((error) => reportConfirmError(error));
};
</script>

<template>
    <LayoutDefault
        id="verify-email-confirm-page"
        :title="t('verify-email-confirm-page.page-title')"
    >
        <v-card class="mx-auto mt-10 w-full max-w-md p-8">
            <p class="mb-4 opacity-80">{{ t('verify-email-confirm-page.intro') }}</p>
            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.token"
                    type="text"
                    data-test="verify-token"
                    :label="t('verify-email-confirm-page.label-token')"
                    :error-messages="showFormErrors ? (formErrors.token ?? []) : []"
                    class="mb-4"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    block
                    data-test="verify-submit"
                    :loading="isSubmitting"
                >
                    {{ t('verify-email-confirm-page.button-submit') }}
                </v-btn>
                <InlineErrorAlert
                    :message="confirmError"
                    :type="confirmErrorType"
                    class="mt-4"
                    test-id="verify-email-confirm-error"
                />
            </form>
        </v-card>
    </LayoutDefault>
</template>
