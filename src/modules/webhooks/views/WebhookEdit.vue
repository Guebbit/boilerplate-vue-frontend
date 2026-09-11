<script lang="ts">
export default {
    name: 'WebhookEditPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Webhook subscription edit page. Hydrates from the store's cache by route id (see
 * `store.ts`'s `watchSubscription`) and exposes a url/description/eventTypes/enabled form built
 * on `useStructureFormValidation`. No secret-ring actions here — those live on the detail page,
 * same split `users` keeps its irreversible/audited actions off the plain field-edit form.
 */
import { computed, onMounted, ref } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useWebhooksStore } from '@/modules/webhooks/store';
import { webhookEditSchema } from '@/modules/webhooks/schemas.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { Pencil, Webhook } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import { EMPTY_VALUE, formatText, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';

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
const { currentSubscription, eventCatalogue, loadingEventCatalogue, loadingSubscriptions } =
    storeToRefs(useWebhooksStore());

onMounted(() => void fetchEventCatalogue());

/**
 * Edit form data model.
 */
interface WebhookEditForm {
    url?: string;
    description?: string;
    eventTypes?: string[];
    enabled?: boolean;
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
    isSubmitting,
    resetForm,
    handleSubmit,
    activateAutoHydrate,
    applyServerErrors
} = useStructureFormValidation<WebhookEditForm>({}, webhookEditSchema, {
    formElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * Auto-hydrate the form from the fetched record once it resolves.
 */
activateAutoHydrate(
    computed(() =>
        currentSubscription.value
            ? {
                  url: currentSubscription.value.url,
                  description: currentSubscription.value.description,
                  eventTypes: currentSubscription.value.eventTypes,
                  enabled: currentSubscription.value.enabled
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
 * Validates the form and persists the subscription changes.
 *
 * @returns A promise resolving once the flow settles: a success toast, or the revealed
 *  validation errors when the input is invalid. API failures surface as a toast. A missing route
 *  id is a no-op.
 */
const submitForm = () =>
    handleSubmit(() => {
        if (!id) return;
        const { url, description, eventTypes, enabled } = form.value;
        return updateSubscription(id, { url, description, eventTypes, enabled }).then(() => {
            addMessage(t('webhook-edit-page.success-update'));
        });
    }).catch((error) => {
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });

/**
 * Selects and hydrates the subscription whenever the route id changes.
 */
watchSubscription(() => id);
</script>

<template>
    <LayoutDefault id="webhook-edit-page" :title="t('webhook-edit-page.page-title')">
        <ItemDetailLayout accent="secondary">
            <template #hero>
                <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                    <template #icon><Pencil :size="32" /></template>
                </ItemDetailHero>
            </template>

            <CardDetail>
                <div class="mb-5">
                    <h3 class="text-lg font-semibold">{{ t('generic.details') }}</h3>
                    <p class="mt-1 opacity-75">{{ t('webhook-edit-page.page-title') }}</p>
                </div>

                <form
                    ref="formElement"
                    novalidate
                    class="flex flex-col gap-2"
                    @submit.prevent="submitForm"
                >
                    <v-text-field
                        v-model="form.url"
                        type="url"
                        :label="t('webhook-edit-page.label-url')"
                        :error-messages="showFormErrors ? formErrors.url : []"
                    />
                    <v-text-field
                        v-model="form.description"
                        type="text"
                        :label="t('webhook-edit-page.label-description')"
                        :error-messages="showFormErrors ? formErrors.description : []"
                    />
                    <v-select
                        v-model="form.eventTypes"
                        multiple
                        chips
                        :items="eventCatalogue"
                        item-title="name"
                        item-value="name"
                        :loading="loadingEventCatalogue"
                        :label="t('webhook-edit-page.label-event-types')"
                        :error-messages="showFormErrors ? formErrors.eventTypes : []"
                    />
                    <v-switch
                        v-model="form.enabled"
                        :label="t('webhook-edit-page.label-enabled')"
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
                </form>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="secondary">
                        <template #icon><Webhook :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('webhook-target-page.label-id')"
                        :value="id ?? EMPTY_VALUE"
                        icon="#"
                    />
                    <ItemDetailField
                        :label="t('webhook-target-page.label-created-at')"
                        :value="formatDateTime(currentSubscription?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('webhook-target-page.label-updated-at')"
                        :value="formatDateTime(currentSubscription?.updatedAt)"
                        icon="🕘"
                    />
                </CardDetail>
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
    </LayoutDefault>
</template>
