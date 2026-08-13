<script lang="ts">
export default {
    name: 'ContactPage'
};
</script>

<script setup lang="ts">
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useFeedbackStore } from '@/modules/feedback/store.ts';
import { notifyErrorMessages } from '@/infrastructure/errors.ts';

/**
 * The public contact form. No login required — it exists for the visitor who cannot log in —
 * and the admin reads what lands here in the feedback inbox.
 */
interface IContactForm {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
}

const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();
const { submitContact } = useFeedbackStore();

const { form, formErrors, showFormErrors, isSubmitting, handleSubmit, resetForm } =
    useStructureFormValidation<IContactForm>(
        { name: '', email: '', subject: '', message: '' },
        z.object({
            name: z.string().optional(),
            email: z.email({ error: () => t('contact-page.email-invalid') }),
            subject: z.string().min(1, { error: () => t('contact-page.subject-required') }),
            message: z.string().min(10, { error: () => t('contact-page.message-min') })
        }),
        { revalidateOn: locale }
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
            <form novalidate @submit.prevent="submitForm">
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
