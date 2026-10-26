<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'RefundCancelForm'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The note a staff member writes to void one refund. The note is required because the audit says
 * why; the form validates it and hands it up, and owns neither the request nor its failure: the
 * drawer that hosts it does both, so a refusal renders where the refund is listed.
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { cancelRefundNoteMax, cancelRefundNoteSchema } from '../schemas.ts';

/**
 * Whether the host's request is out, to block a second submit.
 */
defineProps<{
    busy: boolean;
}>();

/**
 * What the form reports: a valid note to send, or that the staff member changed their mind.
 */
const emit = defineEmits<{
    /**
     * A valid note was submitted.
     */
    (event: 'submit', note: string): void;
    /**
     * The staff member closed the form without voiding the refund.
     */
    (event: 'dismiss'): void;
}>();

/**
 * Translation function and the reactive locale, which re-validates the messages.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher for an invalid submit.
 */
const { addMessage } = useNotificationsStore();

/**
 * The `<form>` element, handed to the validation for its native-validity wiring.
 */
const formElement = ref<HTMLFormElement>();

/**
 * The form's only field.
 */
const schema = z.object({ note: cancelRefundNoteSchema });

/**
 * Field state, errors and submit gating.
 */
const { form, formErrors, showFormErrors, handleSubmit } = useStructureFormValidation(
    { note: '' },
    schema,
    {
        formElement,
        revalidateOn: locale,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * Validates, then hands the trimmed note up.
 *
 * @returns A promise settling once the validation answered.
 */
const submitForm = () => handleSubmit(({ note }) => emit('submit', note));
</script>

<template>
    <form
        ref="formElement"
        novalidate
        class="mt-2 flex flex-col gap-2"
        data-test="refund-cancel-form"
        @submit.prevent="submitForm"
    >
        <v-text-field
            v-model="form.note"
            :label="t('refund-cancel-form.label-note')"
            :hint="t('refund-cancel-form.hint-note')"
            persistent-hint
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.note ?? []) : [])"
            :maxlength="cancelRefundNoteMax"
            density="compact"
            data-test="refund-cancel-note"
        />
        <div class="flex gap-2">
            <v-btn
                type="submit"
                size="small"
                color="error"
                variant="tonal"
                :disabled="busy"
                data-test="refund-cancel-submit"
            >
                {{ t('refund-cancel-form.button-submit') }}
            </v-btn>
            <v-btn
                size="small"
                variant="text"
                :disabled="busy"
                data-test="refund-cancel-dismiss"
                @click="emit('dismiss')"
            >
                {{ t('refund-cancel-form.button-dismiss') }}
            </v-btn>
        </div>
    </form>
</template>
