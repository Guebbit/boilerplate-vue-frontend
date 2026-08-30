<script lang="ts">
export default {
    name: 'ContactPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public contact form, validated with `useAppForm` against a Zod schema and
 * submitted through the feedback store; success resets the form in place.
 */
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useFeedbackStore } from '@/modules/feedback/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * The public contact form. No login required — it exists for the visitor who cannot log in —
 * and the admin reads what lands here in the feedback inbox.
 */
interface ContactForm {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
}

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher.
 */
const { addMessage } = useNotificationsStore();

/**
 * The public submit action this form calls.
 */
const { submitContact } = useFeedbackStore();

/**
 * The `<form>` element, handed to `useAppForm` so it can trigger native validation UI.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, validation and submit wiring, built on the schema below.
 */
const { form, formErrors, showFormErrors, isSubmitting, handleSubmit, resetForm } =
    useAppForm<ContactForm>(
        { name: '', email: '', subject: '', message: '' },
        z.object({
            name: z.string().optional(),
            email: z.email({ error: () => t('contact-page.email-invalid') }),
            subject: z.string().min(1, { error: () => t('contact-page.subject-required') }),
            message: z.string().min(10, { error: () => t('contact-page.message-min') })
        }),
        { formElement }
    );

/**
 * Submits the form; success empties it for the next message.
 *
 * @returns A promise resolving once the flow settles, reported as a toast.
 */
const submitForm = () =>
    handleSubmit(() =>
        submitContact({
            name: form.value.name || undefined,
            email: form.value.email ?? '',
            subject: form.value.subject ?? '',
            message: form.value.message ?? ''
        }).then(() => {
            addMessage(t('contact-page.success'));
            resetForm();
        })
    ).catch((error) => notifyErrorMessages(addMessage, error));
</script>

<template>
    <LayoutDefault id="contact-page" :title="t('contact-page.page-title')">
        <v-card class="mx-auto mt-10 w-full max-w-xl p-8">
            <p class="mb-4 opacity-80">{{ t('contact-page.intro') }}</p>
            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.name"
                    type="text"
                    autocomplete="name"
                    data-test="contact-name"
                    :label="t('contact-page.label-name')"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    data-test="contact-email"
                    :label="t('contact-page.label-email')"
                    :error-messages="showFormErrors ? (formErrors.email ?? []) : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.subject"
                    type="text"
                    data-test="contact-subject"
                    :label="t('contact-page.label-subject')"
                    :error-messages="showFormErrors ? (formErrors.subject ?? []) : []"
                    class="mb-2"
                />
                <v-textarea
                    v-model="form.message"
                    data-test="contact-message"
                    :label="t('contact-page.label-message')"
                    :error-messages="showFormErrors ? (formErrors.message ?? []) : []"
                    rows="5"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    block
                    class="mt-4"
                    data-test="contact-submit"
                    :loading="isSubmitting"
                >
                    {{ t('contact-page.button-submit') }}
                </v-btn>
            </form>
        </v-card>
    </LayoutDefault>
</template>
