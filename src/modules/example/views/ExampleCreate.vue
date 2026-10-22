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
 * In any module: a create screen is a form on `useStructureFormValidation` inside the shared
 * `FormCard`; a refusal naming a field lands on it, any other blocks the form in place.
 * Here: title and body; a retried submit reuses its `Idempotency-Key` (the store owns it).
 * See: docs/theory/request-flow.md
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useLeaveGuard } from '@/ui/composables/use-leave-guard.ts';
import { useExampleStore } from '../store';
import { exampleFormSchema } from '../schemas.ts';
import FormCard from '@/ui/organisms/FormCard.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
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
    isDirty,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useStructureFormValidation<{ title?: string; body?: string }>({}, exampleFormSchema, {
    // The `<form>` lives in `FormCard`; read through a getter so the element is resolved when a
    // failed submit actually needs it, not while the card is still mounting.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- TypeScript-ESLint cannot fully resolve a template ref's Vue SFC instance type (InstanceType<typeof FormCard>), even with `formElement` explicitly exposed via FormCard.vue's own defineExpose
    formElement: () => card.value?.formElement,
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
                markSaved();
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
                v-bind="fieldErrorProps(showErrors ? formErrors.title : [])"
                class="mb-2"
            />
            <v-textarea
                v-model="form.body"
                data-test="example-body"
                :label="t('example-create-page.label-body')"
                v-bind="fieldErrorProps(showErrors ? formErrors.body : [])"
                rows="6"
                class="mb-2"
            />

            <InlineErrorAlert :message="submitError" data-test="example-create-error" />
        </FormCard>
    </div>
</template>
