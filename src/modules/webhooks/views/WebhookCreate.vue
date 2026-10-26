<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'WebhookCreatePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Webhook subscription create page. Builds a form on `useStructureFormValidation`; on success the
 * one-time secret is held locally and shown through `WebhookSecretRevealModal` before the visitor
 * ever reaches the new subscription's detail page — the store itself never caches it, see
 * `store.ts`.
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useLeaveGuard } from '@/ui/composables/use-leave-guard.ts';
import { useWebhooksStore } from '../store';
import { webhookCreateSchema } from '../schemas.ts';
import FormCard from '@/ui/organisms/FormCard.vue';
import SecretRevealModal from '@/ui/organisms/SecretRevealModal.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';

/**
 * Generics
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Router instance, for the navigation once the reveal modal is dismissed.
 */
const router = useRouter();

/**
 * Webhooks store actions and event catalogue for the `eventTypes` multiselect.
 */
const { createSubscription, fetchEventCatalogue } = useWebhooksStore();

/** Reactive event catalogue and its loading flag. */
const { eventCatalogue, loadingEventCatalogue } = storeToRefs(useWebhooksStore());

// eslint-disable-next-line @typescript-eslint/no-floating-promises -- the read resolves into the composable's error state instead of rejecting
onMounted(() => void fetchEventCatalogue());

/**
 * Reference to the mounted `FormCard`, read for its `<form>` element.
 */
const card = ref<InstanceType<typeof FormCard>>();

/**
 * Form state, validation and submission wiring from the shared app-form composable.
 */
const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isDirty,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useStructureFormValidation<{ url?: string; description?: string; eventTypes?: string[] }>(
    {},
    webhookCreateSchema,
    {
        // The `<form>` lives in `FormCard`; read through a getter so the element is resolved when
        // a failed submit actually needs it, not while the card is still mounting.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- TypeScript-ESLint cannot fully resolve a template ref's Vue SFC instance type (InstanceType<typeof FormCard>), even with `formElement` explicitly exposed via FormCard.vue's own defineExpose
        formElement: () => card.value?.formElement,
        revalidateOn: locale,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * The signed-in viewer's session, read by the leave guard to tell a forced sign-out from a choice.
 */
const session = useSessionStore();

/**
 * Warns before a half-typed form is lost to a navigation; `markSaved` lifts it for a save.
 */
const { markSaved } = useLeaveGuard(isDirty, () => session.isAuth);

/**
 * The id of the subscription just created, once the reveal modal is on screen — held so `Done`
 * knows where to navigate.
 */
const createdSubscriptionId = ref<string>();

/**
 * The newly minted secret, held only long enough to render the reveal modal. Never sent anywhere
 * but this component; the store's own cache never sees it (`store.ts`'s `createSubscription`).
 */
const revealedSecret = ref<string>();

/**
 * This form's own blocked state — a single dedicated submit, so a failed create blocks it in
 * place rather than joining a toast queue the visitor may have looked away from.
 */
const {
    message: submitError,
    report: reportSubmitError,
    clear: clearSubmitError
} = useBlockingError();

/**
 * Validates the form and creates the subscription. On success the secret-reveal modal takes over
 * the page; the visitor is only sent to the new subscription's detail page once they dismiss it.
 *
 * @returns A promise resolving once the flow settles: on success the reveal modal is shown; on
 *  invalid input the errors are revealed; an API failure blocks the form in place
 *  ({@link submitError}).
 */
const submitForm = () => {
    clearSubmitError();
    return handleSubmit(() =>
        // Create has nothing to clear, so its schema is not nullable: an empty description is omitted.
        toRequestBody('CreateWebhookSubscriptionBody', {
            url: form.value.url,
            description: form.value.description,
            eventTypes: form.value.eventTypes
        })
            .then((body) => createSubscription(body))
            .then((created) => {
                if (!created?.secret) return;
                createdSubscriptionId.value = created.id;
                revealedSecret.value = created.secret;
            })
    ).catch((error: unknown) => {
        applyServerErrors(error, { onUnmapped: () => reportSubmitError(error) });
    });
};

/**
 * Leaves the reveal modal and opens the new subscription's detail page.
 */
const handleSecretDone = () => {
    markSaved();
    addMessage(t('webhook-create-page.success-create'));
    const id = createdSubscriptionId.value;
    revealedSecret.value = undefined;
    // Fire-and-forget: a NavigationFailure must not convert a completed create into an error toast.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- vue-router reports a failed navigation through router.onError (app/router/index.ts)
    if (id) void router.push(routerLinkI18n({ name: 'WebhookTarget', params: { id } }));
};
</script>

<template>
    <div id="webhook-create-page">
        <SecretRevealModal
            :secret="revealedSecret"
            :title="t('webhook-secret-modal.title')"
            :intro="t('webhook-secret-modal.intro')"
            @done="handleSecretDone"
        />

        <FormCard
            ref="card"
            :submit-label="t('webhook-create-page.button-submit')"
            :back-to="{ name: 'WebhooksList' }"
            :back-label="t('webhook-create-page.button-go-to-list')"
            :loading="isSubmitting"
            @submit="submitForm"
        >
            <v-text-field
                v-model="form.url"
                type="url"
                data-test="webhook-url"
                :label="t('webhook-create-page.label-url')"
                :hint="t('webhook-create-page.hint-url')"
                persistent-hint
                v-bind="fieldErrorProps(showErrors ? formErrors.url : [])"
                class="mb-2"
            />
            <v-text-field
                v-model="form.description"
                type="text"
                data-test="webhook-description"
                :label="t('webhook-create-page.label-description')"
                v-bind="fieldErrorProps(showErrors ? formErrors.description : [])"
                class="mb-2"
            />
            <v-select
                v-model="form.eventTypes"
                data-test="webhook-event-types"
                multiple
                chips
                :items="eventCatalogue"
                item-title="name"
                item-value="name"
                :loading="loadingEventCatalogue"
                :label="t('webhook-create-page.label-event-types')"
                v-bind="fieldErrorProps(showErrors ? formErrors.eventTypes : [])"
            />

            <InlineErrorAlert :message="submitError" data-test="webhook-create-error" />
        </FormCard>
    </div>
</template>
