<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ExampleEditPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The edit screen. Hydrates from the store's cache by route id (the route guard has already
 * loaded it) and holds every editable field: title, body, status and the cover image. Built on
 * `useStructureFormValidation`; a save sends only what changed, and a cover goes up as its own
 * multipart request after the JSON save.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Calendar, Clock, Hash, NotebookPen, Pencil } from 'lucide-vue-next';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useExampleStore } from '@/modules/example/store';
import { exampleEditSchema } from '@/modules/example/schemas.ts';
import { EXAMPLE_STATUSES } from '@/modules/example/domain';
import type { ExampleStatus } from '@types';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import { EMPTY_VALUE, formatDateTime, formatText } from '@/infrastructure/utils/formatters.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { useAxiosUploadProgress } from '@/ui/composables/use-axios-upload-progress.ts';

/**
 * Generic i18n and notification helpers.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Route example id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Store actions.
 */
const { watchExample, updateExample, setCover } = useExampleStore();

/**
 * The example being edited, and whether the store is busy with it.
 */
const { currentExample, loading } = storeToRefs(useExampleStore());

/**
 * Edit form data model.
 */
interface ExampleEditForm {
    title?: string;
    body?: string;
    status?: ExampleStatus;
    imageUpload?: File;
}

/**
 * The `<form>` element, for focusing the first invalid field.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, validation and submission wiring from the shared form composable.
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
} = useStructureFormValidation<ExampleEditForm>({}, exampleEditSchema, {
    formElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * Fills the form from the record once it is there, and again when the record changes under it.
 */
activateAutoHydrate(
    computed(() =>
        currentExample.value
            ? {
                  title: currentExample.value.title,
                  body: currentExample.value.body,
                  status: currentExample.value.status
              }
            : undefined
    )
);

/**
 * The status select's options, localized.
 *
 * @returns One option per status, re-translated on locale change.
 */
const statusOptions = computed(() =>
    EXAMPLE_STATUSES.map((value) => ({ value, label: t(`example-status.${value}`) }))
);

/**
 * Hero heading.
 *
 * @returns The example's title, the route id while loading, or the page title as a last resort.
 */
const heroTitle = computed(
    () => currentExample.value?.title ?? id ?? t('example-edit-page.page-title')
);

/**
 * Upload progress for the cover, bound to the picker's bar.
 */
const { progress: uploadProgress, trackUpload } = useAxiosUploadProgress();

/**
 * This form's own blocked state: a failed save blocks this form in place.
 */
const { message: formError, report: reportFormError, clear: clearFormError } = useBlockingError();

/**
 * Validates the form and saves it: the changed fields as one JSON PATCH, then the cover, if one
 * was picked, as its own upload.
 *
 * `toRequestBody` diffs against the loaded record, so only what the visitor changed is sent.
 *
 * @returns A promise resolving once the flow settles: a success toast, or the revealed validation
 *  errors for invalid input. An API failure blocks the form in place; a missing id is a no-op.
 */
const submitForm = () => {
    clearFormError();
    return handleSubmit(() => {
        if (!id) return;
        const { title, body, status, imageUpload } = form.value;
        return toRequestBody('UpdateExampleByIdBody', { title, body, status }, currentExample.value)
            .then((changes) => updateExample(id, changes))
            .then(() =>
                imageUpload
                    ? trackUpload(imageUpload, (options) => setCover(id, imageUpload, options))
                    : undefined
            )
            .then(() => {
                // The served `imageUrl` is back in the record, so the picked file has done its job
                // and holding it would only re-upload the same bytes on the next save.
                form.value.imageUpload = undefined;
                addMessage(t('example-edit-page.success-update'));
            });
    }).catch((error: unknown) => {
        applyServerErrors(error, { onUnmapped: () => reportFormError(error) });
    });
};

/**
 * What a 404 or 403 on the routed record does: the Error page, not a form left empty.
 */
const onMissingRecord = useMissingRecord();

/**
 * Selects and hydrates the example whenever the route id changes.
 */
watchExample(() => id, { onError: onMissingRecord });
</script>

<template>
    <div id="example-edit-page">
        <ItemDetailLayout accent="secondary">
            <template #hero>
                <ItemDetailHero
                    :title="heroTitle"
                    :description="formatText(currentExample?.ownerName)"
                    :eyebrow="id"
                >
                    <template #icon><Pencil :size="32" /></template>
                </ItemDetailHero>
            </template>

            <CardDetail>
                <div class="mb-5">
                    <h3 class="text-lg font-semibold">{{ t('generic.details') }}</h3>
                    <p class="mt-1 opacity-75">{{ t('example-edit-page.page-title') }}</p>
                </div>

                <form
                    ref="formElement"
                    novalidate
                    class="flex flex-col gap-2"
                    @submit.prevent="submitForm"
                >
                    <v-text-field
                        v-model="form.title"
                        type="text"
                        data-test="example-title"
                        :label="t('example-edit-page.label-title')"
                        :error-messages="showFormErrors ? formErrors.title : []"
                    />
                    <v-textarea
                        v-model="form.body"
                        data-test="example-body"
                        :label="t('example-edit-page.label-body')"
                        :error-messages="showFormErrors ? formErrors.body : []"
                        rows="6"
                    />
                    <v-select
                        v-model="form.status"
                        data-test="example-status"
                        :label="t('example-edit-page.label-status')"
                        :items="statusOptions"
                        item-title="label"
                        item-value="value"
                        :error-messages="showFormErrors ? formErrors.status : []"
                    />
                    <FormImageUpload
                        v-model="form.imageUpload"
                        :current-image-url="currentExample?.imageUrl"
                        :label="t('example-edit-page.label-cover')"
                        :progress="uploadProgress"
                        :disabled="isSubmitting"
                        class="mt-2"
                    />

                    <div class="flex flex-wrap gap-2">
                        <v-btn
                            type="submit"
                            color="primary"
                            data-test="example-submit"
                            :disabled="isSubmitting || loading"
                        >
                            {{ t('example-edit-page.button-submit') }}
                        </v-btn>
                        <v-btn variant="tonal" @click="resetForm">
                            {{ t('example-edit-page.reset-form') }}
                        </v-btn>
                    </div>

                    <InlineErrorAlert :message="formError" data-test="example-edit-form-error" />
                </form>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo
                        :title="heroTitle"
                        :description="formatText(currentExample?.ownerName)"
                        accent="secondary"
                    >
                        <template #icon><NotebookPen :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('example-target-page.label-id')"
                        :value="id ?? EMPTY_VALUE"
                        :icon="Hash"
                    />
                    <ItemDetailField
                        :label="t('example-target-page.label-created-at')"
                        :value="formatDateTime(currentExample?.createdAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        :label="t('example-target-page.label-updated-at')"
                        :value="formatDateTime(currentExample?.updatedAt)"
                        :icon="Clock"
                    />
                </CardDetail>
            </template>
        </ItemDetailLayout>
    </div>
</template>
