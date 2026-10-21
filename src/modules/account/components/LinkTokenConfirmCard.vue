<script setup lang="ts">
/**
 * @module
 * The card behind every "the link in your mail is the credential" page: one token field prefilled
 * from the URL fragment, one submit button, one in-place error. The page supplies its wording, its
 * `data-test` hooks, the store call that spends the token and where success lands, and optionally a
 * warning, a destructive tone and a footer; everything else
 * — reading and scrubbing the fragment, validation, the toast, the redirect — is the same on every
 * such page and lives here once.
 *
 * A submit button rather than an auto-fire on mount, so a mail scanner prefetching the URL cannot
 * spend the token before the human arrives.
 */
import FormCard from '@/ui/organisms/FormCard.vue';
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
        /** The paragraph above the field, when the page has one. */
        intro?: string;
        /** A warning alert above the form, when the action cannot be undone. */
        warning?: string;
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
    /**
     * An irreversible spend; the button says so in colour.
     */
    destructive?: boolean;
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
 * Reference to the mounted `FormCard`, read for its `<form>` element.
 */
const card = ref<InstanceType<typeof FormCard>>();

/**
 * Form state, error surface and submit handler, from the toolkit's form validation.
 */
const { form, formErrors, showFormErrors, isSubmitting, handleSubmit, applyServerErrors } =
    useStructureFormValidation<LinkTokenForm>(
        {
            token: readLinkToken(route)
        },
        z.object({
            token: z.string().min(1, { error: () => t(props.copy.tokenRequired) })
        }),
        {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- TypeScript-ESLint cannot fully resolve a template ref's Vue SFC instance type (InstanceType<typeof FormCard>), even with `formElement` explicitly exposed via FormCard.vue's own defineExpose
            formElement: () => card.value?.formElement,
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
 *  failure lands on the field the server named, or blocks the form in place ({@link spendError}).
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
    ).catch((error) => {
        applyServerErrors(error, { onUnmapped: () => reportSpendError(error) });
    });
};
</script>

<template>
    <FormCard
        ref="card"
        size="md"
        :submit-label="t(copy.submit)"
        :submit-color="destructive ? 'error' : 'primary'"
        :submit-test="testIds.submit"
        :loading="isSubmitting"
        @submit="submitForm"
    >
        <template #before>
            <v-alert v-if="copy.warning" type="warning" class="mb-6">
                {{ t(copy.warning) }}
            </v-alert>
            <p v-if="copy.intro" class="mb-4 opacity-80">{{ t(copy.intro) }}</p>
        </template>
        <v-text-field
            v-model="form.token"
            type="text"
            :data-test="testIds.token"
            :label="t(copy.label)"
            :error-messages="showFormErrors ? (formErrors.token ?? []) : []"
            class="mb-4"
        />
        <template #after-submit>
            <InlineErrorAlert
                :message="spendError"
                :type="spendErrorType"
                class="mt-4"
                :data-test="testIds.error"
            />
        </template>
        <template #footer>
            <!-- Page-owned way out, e.g. a back link. -->
            <slot name="footer" />
        </template>
    </FormCard>
</template>
