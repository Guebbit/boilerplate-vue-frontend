<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ExampleCreatePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The create screen: a form built on `useStructureFormValidation` inside the shared `FormCard`.
 * Validation is the Zod schema, a server refusal that names a field lands on that field, and any
 * other failure blocks the form in place; success toasts and opens the new example.
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useExampleStore } from '@/modules/example/store';
import { exampleCreateSchema } from '@/modules/example/schemas.ts';
import FormCard from '@/ui/organisms/FormCard.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';

/**
 * Generics.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report the outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Router instance, for the navigation once the example exists.
 */
const router = useRouter();

/**
 * Store action.
 */
const { createExample } = useExampleStore();

/**
 * Reference to the mounted `FormCard`, read for its `<form>` element.
 */
const card = ref<InstanceType<typeof FormCard>>();

/**
 * Form state, validation and submission wiring from the shared form composable.
 */
const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useStructureFormValidation<{ title?: string; body?: string }>({}, exampleCreateSchema, {
    // The `<form>` lives in `FormCard`; read through a getter so the element is resolved when a
    // failed submit actually needs it, not while the card is still mounting.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- TypeScript-ESLint cannot fully resolve a template ref's Vue SFC instance type (InstanceType<typeof FormCard>), even with `formElement` explicitly exposed via FormCard.vue's own defineExpose
    formElement: () => card.value?.formElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * This form's own blocked state: a single dedicated submit, so a failed create blocks it in place
 * rather than joining a toast queue the visitor may have looked away from.
 */
const {
    message: submitError,
    report: reportSubmitError,
    clear: clearSubmitError
} = useBlockingError();

/**
 * Validates the form, creates the example, and opens it.
 *
 * @returns A promise resolving once the flow settles: invalid input reveals its errors, an API
 *  failure blocks the form in place.
 */
const submitForm = () => {
    clearSubmitError();
    return handleSubmit(() =>
        // A create has nothing to clear, so an empty field is omitted rather than sent as `null`.
        toRequestBody('CreateExampleBody', { title: form.value.title, body: form.value.body })
            .then((body) => createExample(body))
            .then((created) => {
                addMessage(t('example-create-page.success-create'));
                // Fire-and-forget: a NavigationFailure must not turn a completed create into an error.
                if (created)
                    void router.push(
                        routerLinkI18n({ name: 'ExampleTarget', params: { id: created.id } })
                    );
            })
    ).catch((error: unknown) => {
        applyServerErrors(error, { onUnmapped: () => reportSubmitError(error) });
    });
};
</script>

<template>
    <div id="example-create-page">
        <FormCard
            ref="card"
            :submit-label="t('example-create-page.button-submit')"
            :back-to="{ name: 'ExamplesList' }"
            :back-label="t('example-create-page.button-go-to-list')"
            :loading="isSubmitting"
            @submit="submitForm"
        >
            <v-text-field
                v-model="form.title"
                type="text"
                data-test="example-title"
                :label="t('example-create-page.label-title')"
                :error-messages="showErrors ? formErrors.title : []"
                class="mb-2"
            />
            <v-textarea
                v-model="form.body"
                data-test="example-body"
                :label="t('example-create-page.label-body')"
                :error-messages="showErrors ? formErrors.body : []"
                rows="6"
                class="mb-2"
            />

            <InlineErrorAlert :message="submitError" data-test="example-create-error" />
        </FormCard>
    </div>
</template>
