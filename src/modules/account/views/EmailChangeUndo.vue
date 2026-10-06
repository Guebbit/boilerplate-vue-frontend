<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'EmailChangeUndoPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public undo page for an email change: the link goes to the OLD address, and its token is the
 * credential. A submit button (rather than firing on mount) keeps a mail scanner that prefetches
 * the link from spending the token before the human arrives. Same shape as the confirm page, a
 * different token (`account/services/token-types.ts`'s `EMAIL_CHANGE_UNDO_TOKEN_TYPE`). Success
 * lands on Login: the server ended every session, so there is nothing signed in to return to.
 */
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { readLinkToken, useLinkTokenCleanup } from '@/infrastructure/utils/use-link-token.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';

/**
 * Form state: only the one-time token, prefilled from the email link.
 */
interface EmailChangeUndoForm {
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
 * Spends the undo token.
 */
const { undoEmailChange } = useProfileStore();

/**
 * The `<form>` itself, so `useStructureFormValidation` can focus the first invalid field
 * on submit.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, error surface and submit handler, from the toolkit's form validation.
 */
const { form, formErrors, showFormErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<EmailChangeUndoForm>(
        {
            token: readLinkToken(route)
        },
        z.object({
            token: z.string().min(1, { error: () => t('email-change-undo-page.token-required') })
        }),
        {
            formElement,
            revalidateOn: locale,
            invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
            onInvalid: () => addMessage(t('generic.fix-errors'))
        }
    );

// The token is the only credential for this action; it must not linger in the URL (a `#token=` fragment) for every
// pageview and observability event after mount to carry to Umami, Faro and browser history.
useLinkTokenCleanup(route, router);

/**
 * This submit's own blocked state — a spent or unknown token names no field, so it lands here
 * instead of a toast, next to the button the visitor just pressed.
 */
const {
    message: undoError,
    type: undoErrorType,
    report: reportUndoError,
    clear: clearUndoError
} = useBlockingError();

/**
 * Spends the token; success goes to Login, since every session was ended.
 *
 * @returns A promise resolving once the undo settles: success is a toast, a failure blocks the
 *  form in place ({@link undoError}).
 */
const submitForm = () => {
    clearUndoError();
    return handleSubmit(() =>
        undoEmailChange(form.value.token ?? '')
            .then(() => {
                addMessage(t('email-change-undo-page.success'));
                return router.push(routerLinkI18n({ name: 'Login' }));
            })
            // Swallows `router.push`'s resolved value — a failed navigation is the router's own
            // `onError` to report, not this form's.
            .then(() => undefined)
    ).catch((error) => reportUndoError(error));
};
</script>

<template>
    <div id="email-change-undo-page">
        <v-card class="mx-auto mt-10 w-full max-w-md p-8">
            <p class="mb-4 opacity-80">{{ t('email-change-undo-page.intro') }}</p>
            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.token"
                    type="text"
                    data-test="email-change-undo-token"
                    :label="t('email-change-undo-page.label-token')"
                    :error-messages="showFormErrors ? (formErrors.token ?? []) : []"
                    class="mb-4"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    block
                    data-test="email-change-undo-submit"
                    :loading="isSubmitting"
                    :disabled="isSubmitting"
                >
                    {{ t('email-change-undo-page.button-submit') }}
                </v-btn>
                <InlineErrorAlert
                    :message="undoError"
                    :type="undoErrorType"
                    class="mt-4"
                    data-test="email-change-undo-error"
                />
            </form>
        </v-card>
    </div>
</template>
