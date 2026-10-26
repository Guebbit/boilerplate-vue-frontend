<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'WebhookEditPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Webhook subscription edit page. Loads its own record by route id (see `store.ts`'s
 * `watchSubscription`; a 404 or 403 leaves for the Error page) and exposes a
 * url/description/eventTypes form built on `useStructureFormValidation`. No secret-ring actions
 * and no on/off switch here — those live on the detail page, same split `users` keeps its
 * irreversible/audited actions off the plain field-edit form.
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { computed, onMounted, ref } from 'vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useLeaveGuard } from '@/ui/composables/use-leave-guard.ts';
import { holdWhileSubmitting } from '@/ui/composables/use-hold-while-submitting.ts';
import { useWebhooksStore } from '../store';
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { webhookEditSchema } from '../schemas.ts';
import { Calendar, Clock, Hash, Pencil, Webhook } from 'lucide-vue-next';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import RecordAsideCard from '@/ui/organisms/RecordAsideCard.vue';
import type { DetailFieldRow } from '@/ui/types.ts';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { formatText, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';

/**
 * Generic i18n/notifications helpers.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Subscription id route param.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Webhooks store actions and event catalogue for the `eventTypes` multiselect.
 */
const { watchSubscription, updateSubscription, fetchEventCatalogue } = useWebhooksStore();

/** Reactive current subscription, event catalogue and the two loading flags. */
const { currentSubscription, eventCatalogue, loadingEventCatalogue, loadingSubscriptions } =
    storeToRefs(useWebhooksStore());

// eslint-disable-next-line @typescript-eslint/no-floating-promises -- the read resolves into the composable's error state instead of rejecting
onMounted(() => void fetchEventCatalogue());

/**
 * Edit form data model.
 */
interface WebhookEditForm {
    url?: string;
    description?: string;
    eventTypes?: string[];
}

/**
 * Toolkit form bindings.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, validation and submission wiring from the shared app-form composable.
 */
const {
    form,
    formErrors,
    showFormErrors,
    isDirty,
    isSubmitting,
    resetForm,
    handleSubmit,
    activateAutoHydrate,
    applyServerErrors
} = useStructureFormValidation<WebhookEditForm>({}, webhookEditSchema, {
    formElement,
    revalidateOn: locale,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * The signed-in viewer's session, read by the leave guard to tell a forced sign-out from a choice.
 */
const session = useSessionStore();

/**
 * Warns before a half-typed form is lost to a navigation; `markSaved` lifts it for a save.
 */
const { markSaved } = useLeaveGuard(isDirty, () => session.isAuth);

/**
 * Auto-hydrate the form from the fetched record once it resolves.
 */
activateAutoHydrate(
    holdWhileSubmitting(isSubmitting, () =>
        currentSubscription.value
            ? {
                  url: currentSubscription.value.url,
                  description: currentSubscription.value.description,
                  eventTypes: currentSubscription.value.eventTypes
              }
            : undefined
    )
);

/**
 * Hero heading.
 *
 * @returns The subscription's URL, the route id while loading, or the generic page title as a
 *  last resort.
 */
const heroTitle = computed(
    () => currentSubscription.value?.url ?? id ?? t('webhook-edit-page.page-title')
);

/**
 * Hero subheading.
 *
 * @returns The subscription's description, or the empty-value glyph when unknown.
 */
const heroDescription = computed(() => formatText(currentSubscription.value?.description));

/**
 * This form's own blocked state — a failed save blocks this specific form, separate from the
 * secret-ring and delete actions on the detail page.
 */
const { message: formError, report: reportFormError, clear: clearFormError } = useBlockingError();

/**
 * Validates the form and persists the subscription changes.
 *
 * {@link toRequestBody} turns a hand-cleared `description` (Vuetify gives `''`) into the `null`
 * the contract spells "clear" — the raw empty string would be a 422.
 *
 * @returns A promise resolving once the flow settles: a success toast, or the revealed
 *  validation errors when the input is invalid. An API failure blocks the form in place
 *  ({@link formError}). A missing route id is a no-op.
 */
const submitForm = () => {
    clearFormError();
    return handleSubmit(() => {
        if (!id) return;
        const { url, description, eventTypes } = form.value;
        return toRequestBody(
            'UpdateWebhookSubscriptionBody',
            { url, description, eventTypes },
            currentSubscription.value
        )
            .then((body) => updateSubscription(id, body))
            .then(() => {
                markSaved();
                addMessage(t('webhook-edit-page.success-update'));
            });
    }).catch((error) => {
        applyServerErrors(error, { onUnmapped: () => reportFormError(error) });
    });
};

/**
 * Selects and loads the subscription whenever the route id changes; a missing or forbidden one
 * leaves for the Error page.
 */
watchSubscription(() => id, { onError: useMissingRecord() });

/**
 * The rows of the aside summary card: identity and timestamps, formatted for display.
 */
const asideFields = computed<DetailFieldRow[]>(() => [
    { label: t('webhook-target-page.label-id'), value: id, icon: Hash },
    {
        label: t('webhook-target-page.label-created-at'),
        value: formatDateTime(currentSubscription.value?.createdAt),
        icon: Calendar
    },
    {
        label: t('webhook-target-page.label-updated-at'),
        value: formatDateTime(currentSubscription.value?.updatedAt),
        icon: Clock
    }
]);
</script>

<template>
    <div id="webhook-edit-page">
        <ItemDetailLayout accent="secondary">
            <template #hero>
                <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                    <template #icon><Pencil :size="32" /></template>
                </ItemDetailHero>
            </template>

            <CardDetail :title="t('generic.details')" :subtitle="t('webhook-edit-page.page-title')">
                <form
                    ref="formElement"
                    novalidate
                    class="flex flex-col gap-2"
                    @submit.prevent="submitForm"
                >
                    <fieldset
                        :disabled="loadingSubscriptions"
                        class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
                    >
                        <v-text-field
                            v-model="form.url"
                            type="url"
                            data-test="webhook-url"
                            :label="t('webhook-edit-page.label-url')"
                            v-bind="fieldErrorProps(showFormErrors ? formErrors.url : [])"
                        />
                        <v-text-field
                            v-model="form.description"
                            type="text"
                            data-test="webhook-description"
                            :label="t('webhook-edit-page.label-description')"
                            v-bind="fieldErrorProps(showFormErrors ? formErrors.description : [])"
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
                            :label="t('webhook-edit-page.label-event-types')"
                            v-bind="fieldErrorProps(showFormErrors ? formErrors.eventTypes : [])"
                        />

                        <div class="flex flex-wrap gap-2">
                            <v-btn
                                type="submit"
                                color="primary"
                                :disabled="isSubmitting || loadingSubscriptions"
                            >
                                {{ t('webhook-edit-page.button-submit') }}
                            </v-btn>
                            <v-btn variant="tonal" @click="resetForm">
                                {{ t('webhook-edit-page.reset-form') }}
                            </v-btn>
                        </div>

                        <InlineErrorAlert
                            :message="formError"
                            data-test="webhook-edit-form-error"
                        />
                    </fieldset>
                </form>
            </CardDetail>

            <template #aside>
                <RecordAsideCard
                    :title="heroTitle"
                    :description="heroDescription"
                    accent="secondary"
                    :fields="asideFields"
                >
                    <template #icon><Webhook :size="28" /></template>
                </RecordAsideCard>
            </template>

            <template #actions>
                <v-btn
                    v-if="id"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'WebhookTarget', params: { id } })"
                >
                    {{ t('webhook-edit-page.button-go-to-details') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'WebhooksList' })">
                    {{ t('webhook-edit-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </div>
</template>
