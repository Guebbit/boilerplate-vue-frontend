<script setup lang="ts">
/**
 * @module
 * The card behind every "the link in your mail is the credential" page: one token field prefilled
 * from the URL fragment, one submit button, one in-place error. The page supplies its wording, its
 * `data-test` hooks, the store call that spends the token and where success lands; everything else
 * — reading and scrubbing the fragment, validation, the toast, the redirect — is the same on every
 * such page and lives here once.
 *
 * A submit button rather than an auto-fire on mount, so a mail scanner prefetching the URL cannot
 * spend the token before the human arrives.
 */
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { readLinkToken, useLinkTokenCleanup } from '@/infrastructure/utils/use-link-token.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';

/**
 * What the owning page decides; the card decides nothing else.
 */
const props = defineProps<{
    /**
     * Full translation keys (not a prefix), so each one stays a literal the unused-key sweep and
     * a plain grep can both find.
     */
    copy: {
        /** The paragraph above the field. */
        intro: string;
        /** The token field's label. */
        label: string;
        /** The submit button's text. */
        submit: string;
        /** The field message for an empty token. */
        tokenRequired: string;
        /** The toast once the token is spent. */
        success: string;
    };
    /**
     * `data-test` hooks the e2e journeys select on.
     */
    testIds: {
        /** The token field. */
        token: string;
        /** The submit button. */
        submit: string;
        /** The in-place error alert. */
        error: string;
    };
    /**
     * The store call that spends the token. Its rejection blocks the form in place.
     */
    spend: (token: string) => Promise<unknown>;
    /**
     * Named route success navigates to: `Home` while the session survives the action, `Login`
     * when the server ended it.
     */
    successRoute: 'Home' | 'Login';
}>();

/**
 * Form state: only the one-time token, prefilled from the email link.
 */
interface LinkTokenForm {
    token?: string;
}

/**
 * Translation function, and the currently active locale code.
 */
const { t, locale } = useI18n();

/**
 * Current route, read for the `#token=` fragment.
 */
const route = useRoute();

/**
 * Router instance, for the fragment cleanup and the success redirect.
 */
const router = useRouter();

/**
 * Toast dispatcher, used to report success and an invalid submit.
 */
const { addMessage } = useNotificationsStore();

/**
 * The `<form>` itself, so `useStructureFormValidation` can focus the first invalid field
 * on submit.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, error surface and submit handler, from the toolkit's form validation.
 */
const { form, formErrors, showFormErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<LinkTokenForm>(
        {
            token: readLinkToken(route)
        },
        z.object({
            token: z.string().min(1, { error: () => t(props.copy.tokenRequired) })
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
    message: spendError,
    type: spendErrorType,
    report: reportSpendError,
    clear: clearSpendError
} = useBlockingError();

/**
 * Spends the token, then toasts and leaves for {@link props.successRoute}.
 *
 * @returns A promise resolving once the call settles: success is a toast and a navigation, a
 *  failure blocks the form in place ({@link spendError}).
 */
const submitForm = () => {
    clearSpendError();
    return handleSubmit(({ token }) =>
        props
            .spend(token ?? '')
            .then(() => {
                addMessage(t(props.copy.success));
                return router.push(routerLinkI18n({ name: props.successRoute }));
            })
            // Swallows `router.push`'s resolved value — a failed navigation is the router's own
            // `onError` to report, not this form's.
            .then(() => undefined)
    ).catch((error) => reportSpendError(error));
};
</script>

<template>
    <v-card class="mx-auto mt-10 w-full max-w-md p-8">
        <p class="mb-4 opacity-80">{{ t(copy.intro) }}</p>
        <form ref="formElement" novalidate @submit.prevent="submitForm">
            <v-text-field
                v-model="form.token"
                type="text"
                :data-test="testIds.token"
                :label="t(copy.label)"
                :error-messages="showFormErrors ? (formErrors.token ?? []) : []"
                class="mb-4"
            />
            <v-btn
                type="submit"
                color="primary"
                block
                :data-test="testIds.submit"
                :loading="isSubmitting"
                :disabled="isSubmitting"
            >
                {{ t(copy.submit) }}
            </v-btn>
            <InlineErrorAlert
                :message="spendError"
                :type="spendErrorType"
                class="mt-4"
                :data-test="testIds.error"
            />
        </form>
    </v-card>
</template>
