<script lang="ts">
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
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useWebhooksStore } from '@/modules/webhooks/store';
import { webhookCreateSchema } from '@/modules/webhooks/schemas.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormCard from '@/ui/organisms/FormCard.vue';
import SecretRevealModal from '@/ui/organisms/SecretRevealModal.vue';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';

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
const { eventCatalogue, loadingEventCatalogue } = storeToRefs(useWebhooksStore());

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
    isSubmitting,
    handleSubmit
} = useStructureFormValidation<{ url?: string; description?: string; eventTypes?: string[] }>(
    {},
    webhookCreateSchema,
    {
        // The `<form>` lives in `FormCard`; read through a getter so the element is resolved when
        // a failed submit actually needs it, not while the card is still mounting.
        formElement: () => card.value?.formElement,
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

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
 * Validates the form and creates the subscription. On success the secret-reveal modal takes over
 * the page; the visitor is only sent to the new subscription's detail page once they dismiss it.
 *
 * @returns A promise resolving once the flow settles: on success the reveal modal is shown; on
 *  invalid input the errors are revealed; API failures are reported as toasts.
 */
const submitForm = () =>
    handleSubmit(() =>
        createSubscription({
            url: form.value.url!,
            description: form.value.description,
            eventTypes: form.value.eventTypes!
        }).then((created) => {
            if (!created?.secret) return;
            createdSubscriptionId.value = created.id;
            revealedSecret.value = created.secret;
        })
    ).catch((error) => notifyErrorMessages(addMessage, error));

/**
 * Leaves the reveal modal and opens the new subscription's detail page.
 */
const handleSecretDone = () => {
    addMessage(t('webhook-create-page.success-create'));
    const id = createdSubscriptionId.value;
    revealedSecret.value = undefined;
    // Fire-and-forget: a NavigationFailure must not convert a completed create into an error toast.
    if (id) void router.push(routerLinkI18n({ name: 'WebhookTarget', params: { id } }));
};
</script>

<template>
    <LayoutDefault id="webhook-create-page" :title="t('webhook-create-page.page-title')">
        <v-dialog :model-value="!!revealedSecret" persistent max-width="640">
            <SecretRevealModal
                v-if="revealedSecret"
                :secret="revealedSecret"
                :title="t('webhook-secret-modal.title')"
                :intro="t('webhook-secret-modal.intro')"
                @done="handleSecretDone"
            />
        </v-dialog>

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
                :label="t('webhook-create-page.label-url')"
                :hint="t('webhook-create-page.hint-url')"
                persistent-hint
                :error-messages="showErrors ? formErrors.url : []"
                class="mb-2"
            />
            <v-text-field
                v-model="form.description"
                type="text"
                :label="t('webhook-create-page.label-description')"
                :error-messages="showErrors ? formErrors.description : []"
                class="mb-2"
            />
            <v-select
                v-model="form.eventTypes"
                multiple
                chips
                :items="eventCatalogue"
                item-title="name"
                item-value="name"
                :loading="loadingEventCatalogue"
                :label="t('webhook-create-page.label-event-types')"
                :error-messages="showErrors ? formErrors.eventTypes : []"
            />
        </FormCard>
    </LayoutDefault>
</template>
