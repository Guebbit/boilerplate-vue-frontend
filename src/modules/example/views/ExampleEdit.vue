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
 * In any module: an edit screen hydrates from the cache by route id, sends only what changed, and
 * says so when the record moved under it (412, with "reload latest").
 * Here: title, body and a cover; the status is not a field but the server's own moves, and the form
 * is read-only when the row's `actions.update` is false.
 * See: docs/theory/request-flow.md#conditional-writes
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Calendar, Clock, Hash, NotebookPen, Pencil } from 'lucide-vue-next';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useLeaveGuard } from '@/ui/composables/use-leave-guard.ts';
import { holdWhileSubmitting } from '@/ui/composables/use-hold-while-submitting.ts';
import { useExampleStore } from '../store';
import { exampleFormSchema } from '../schemas.ts';
import { provideExample } from '../provided.ts';
import ExampleStatusActions from '../components/ExampleStatusActions.vue';
import { useExampleTransition } from '../composables/use-example-transition.ts';
import { useStaleRecord } from '@/infrastructure/utils/use-stale-record.ts';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import RecordAsideCard from '@/ui/organisms/RecordAsideCard.vue';
import type { DetailFieldRow } from '@/ui/types.ts';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import { formatDateTime, formatText } from '@/infrastructure/utils/formatters.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';
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
const { watchExample, updateExample, setCover, fetchExample } = useExampleStore();

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
    isDirty,
    isSubmitting,
    resetForm,
    handleSubmit,
    activateAutoHydrate,
    applyServerErrors
} = useStructureFormValidation<ExampleEditForm>({}, exampleFormSchema, {
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
 * Fills the form from the record once it is there, and again when the record changes under it.
 */
activateAutoHydrate(
    holdWhileSubmitting(isSubmitting, () =>
        currentExample.value
            ? {
                  title: currentExample.value.title,
                  body: currentExample.value.body
              }
            : undefined
    )
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
const {
    message: formError,
    report: reportFormError,
    warn: warnFormError,
    clear: clearFormError
} = useBlockingError();

/**
 * The save came back 412: the example changed since it was loaded (a peer moved its status, say).
 * "Reload latest" re-reads the record past the cache, which re-hydrates the form and refreshes the
 * `ETag` the next save sends.
 */
const {
    isStale,
    handle: handleStaleSave,
    reloadLatest
} = useStaleRecord({ warn: warnFormError, clear: clearFormError }, () =>
    id ? fetchExample(id, { forced: true }) : Promise.resolve()
);

/**
 * The status door: the same composable the detail screen uses. The buttons render the moves the
 * server lists for this caller, so an editor cannot offer what the row would refuse.
 */
const { changeStatus, error: statusError } = useExampleTransition(() => id);

provideExample({ example: currentExample, changeStatus });

/**
 * Whether the server lets this caller edit this row. The route's coarse `meta.can` let them in; the
 * row has the final say, and a read-only caller sees the form disabled and told why.
 *
 * @returns `false` only when the record says so; true while it loads.
 */
const mayEdit = computed(() => currentExample.value?.actions.update !== false);

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
        const { title, body, imageUpload } = form.value;
        return toRequestBody('UpdateExampleByIdBody', { title, body }, currentExample.value)
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
                markSaved();
                addMessage(t('example-edit-page.success-update'));
            });
    }).catch((error: unknown) => {
        if (handleStaleSave(error)) return;
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

/**
 * The rows of the aside summary card: identity and timestamps, formatted for display.
 */
const asideFields = computed<DetailFieldRow[]>(() => [
    { label: t('example-target-page.label-id'), value: id, icon: Hash },
    {
        label: t('example-target-page.label-created-at'),
        value: formatDateTime(currentExample.value?.createdAt),
        icon: Calendar
    },
    {
        label: t('example-target-page.label-updated-at'),
        value: formatDateTime(currentExample.value?.updatedAt),
        icon: Clock
    }
]);
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

            <CardDetail :title="t('generic.details')" :subtitle="t('example-edit-page.page-title')">
                <form
                    ref="formElement"
                    novalidate
                    class="flex flex-col gap-2"
                    @submit.prevent="submitForm"
                >
                    <v-alert
                        v-if="!mayEdit"
                        type="info"
                        variant="tonal"
                        class="mb-2"
                        data-test="example-read-only"
                    >
                        {{ t('example-edit-page.read-only') }}
                    </v-alert>
                    <fieldset
                        :disabled="loading || !mayEdit"
                        class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
                    >
                        <v-text-field
                            v-model="form.title"
                            type="text"
                            data-test="example-title"
                            :label="t('example-edit-page.label-title')"
                            v-bind="fieldErrorProps(showFormErrors ? formErrors.title : [])"
                        />
                        <v-textarea
                            v-model="form.body"
                            data-test="example-body"
                            :label="t('example-edit-page.label-body')"
                            v-bind="fieldErrorProps(showFormErrors ? formErrors.body : [])"
                            rows="6"
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

                        <InlineErrorAlert
                            :message="formError"
                            :type="isStale ? 'warning' : 'error'"
                            data-test="example-edit-form-error"
                        />
                        <v-btn
                            v-if="isStale"
                            variant="tonal"
                            color="warning"
                            data-test="example-reload-latest"
                            :loading="loading"
                            @click="reloadLatest"
                        >
                            {{ t('generic.action-reload-latest') }}
                        </v-btn>
                    </fieldset>
                </form>
            </CardDetail>

            <template #aside>
                <RecordAsideCard
                    :title="heroTitle"
                    :description="formatText(currentExample?.ownerName)"
                    accent="secondary"
                    :fields="asideFields"
                >
                    <template #icon><NotebookPen :size="28" /></template>
                    <div v-if="currentExample?.actions.transitions.length">
                        <h3 class="mb-3 text-lg font-semibold">
                            {{ t('example-target-page.section-status') }}
                        </h3>
                        <ExampleStatusActions />
                        <InlineErrorAlert
                            :message="statusError"
                            class="mt-3"
                            data-test="example-edit-status-error"
                        />
                    </div>
                </RecordAsideCard>
            </template>
        </ItemDetailLayout>
    </div>
</template>
