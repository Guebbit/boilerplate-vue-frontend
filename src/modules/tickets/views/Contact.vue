<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ContactPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public contact form, validated with `useStructureFormValidation` against a Zod schema and
 * submitted through the tickets store; success resets the form in place.
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import FormCard from '@/ui/organisms/FormCard.vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useTicketsStore } from '../store.ts';
import { contactSchema, orderNumberMax } from '../schemas.ts';
import { TicketCategory } from '@/types/enums.ts';
import type { TicketCategory as TTicketCategory } from '@types';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import HumanCheck from '@/ui/organisms/HumanCheck.vue';
import { withAntibotToken } from '@/infrastructure/http/antibot.ts';

/**
 * The public contact form. No login required — it exists for the visitor who cannot log in —
 * and the admin reads what lands here in the ticket inbox.
 */
interface ContactForm {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    /** What the message is about; optional, and filled from `?category=` when an order page links here. */
    category?: TTicketCategory;
    /** The order the visitor says this is about, free text; filled from `?order=`. */
    orderNumber?: string;
    /**
     * Honeypot. A real visitor never sees or reaches this field — see the template — so it
     * stays empty; a bot's generic autofill often populates it by name. The BE writes a non-empty
     * value as spam and skips the notification.
     */
    website?: string;
}

/**
 * Translation function.
 */
const { t, locale } = useI18n();

/**
 * The address the visitor arrived on, whose `?category=` and `?order=` pre-fill the form (an order
 * page links here so the visitor does not retype what the shop already knows).
 */
const route = useRoute();

/**
 * The category a link named, when it is one the contract knows; anything else is ignored.
 *
 * @returns the category, or `undefined`.
 */
const categoryFromLink = (): TTicketCategory | undefined => {
    const wanted = route.query.category;
    return Object.values(TicketCategory).find((category) => category === wanted);
};

/**
 * The order number a link named, when it is plain text.
 *
 * @returns the order number, or an empty string.
 */
const orderFromLink = (): string => {
    const wanted = route.query.order;
    return typeof wanted === 'string' ? wanted.slice(0, orderNumberMax) : '';
};

/**
 * The category choices, labelled in the visitor's language, led by "no category".
 */
const categoryOptions = computed(() => [
    { value: undefined, title: t('contact-page.category-none') },
    ...Object.values(TicketCategory).map((category) => ({
        value: category,
        title: t(`contact-page.category-${category}`)
    }))
]);

/**
 * Toast dispatcher.
 */
const { addMessage } = useNotificationsStore();

/**
 * The public submit action this form calls.
 */
const { submitContact } = useTicketsStore();

/**
 * The human-challenge widget. `POST /tickets` is always guarded by `humanChallengeGate`,
 * so this attaches unconditionally rather than waiting for a first refusal.
 */
const humanCheck = ref<InstanceType<typeof HumanCheck>>();

/**
 * Reference to the mounted `FormCard`, read for its `<form>` element.
 */
const card = ref<InstanceType<typeof FormCard>>();

/**
 * Form state, validation and submit wiring, built on the schema below.
 */
const {
    form,
    formErrors,
    showFormErrors,
    isSubmitting,
    handleSubmit,
    resetForm,
    applyServerErrors
} = useStructureFormValidation<ContactForm>(
    {
        name: '',
        email: '',
        subject: '',
        message: '',
        category: categoryFromLink(),
        orderNumber: orderFromLink(),
        website: ''
    },
    contactSchema,
    {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- TypeScript-ESLint cannot fully resolve a template ref's Vue SFC instance type (InstanceType<typeof FormCard>), even with `formElement` explicitly exposed via FormCard.vue's own defineExpose
        formElement: () => card.value?.formElement,
        revalidateOn: locale,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * This form's own blocked state — the one dedicated submit button the visitor cannot proceed past
 * until it succeeds.
 */
const {
    message: submitError,
    report: reportSubmitError,
    clear: clearSubmitError
} = useBlockingError();

/**
 * Submits the form; success empties it for the next message.
 *
 * @returns A promise resolving once the flow settles; a failure blocks the form in place
 *  ({@link submitError}).
 */
const submitForm = () =>
    handleSubmit(() => {
        clearSubmitError();
        return submitContact(
            {
                name: form.value.name || undefined,
                email: form.value.email ?? '',
                subject: form.value.subject ?? '',
                message: form.value.message ?? '',
                category: form.value.category || undefined,
                orderNumber: form.value.orderNumber?.trim() || undefined,
                website: form.value.website || undefined
            },
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- TypeScript-ESLint cannot fully resolve a template ref's Vue SFC instance type (InstanceType<typeof HumanCheck>), even with `token` explicitly exposed via HumanCheck.vue's own defineExpose
            withAntibotToken(humanCheck.value?.token)
        ).then(() => {
            addMessage(t('contact-page.success'));
            resetForm();
        });
    }).catch((error: unknown) => {
        applyServerErrors(error, { onUnmapped: () => reportSubmitError(error) });
    });
</script>

<template>
    <div id="contact-page">
        <FormCard
            ref="card"
            size="xl"
            :submit-label="t('contact-page.button-submit')"
            :loading="isSubmitting"
            @submit="submitForm"
        >
            <template #before>
                <p class="mb-4 opacity-80">{{ t('contact-page.intro') }}</p>
            </template>
            <!--
                    Honeypot. `aria-hidden` and `tabindex="-1"` take it out of the accessibility
                    tree and the tab order entirely, rather than merely out of sight — a
                    `display:none` field a screen reader still exposed would fail every a11y check
                    for a nonexistent label, and a sighted visitor who somehow reached it would be
                    filling in something that marks their own message as spam. `autocomplete="off"`
                    keeps a browser from ever offering to fill it for a real visitor either.
                -->
            <!-- eslint-disable-next-line better-tailwindcss/no-restricted-classes -- the honeypot must sit off-screen yet stay filled by bots: not sr-only, not hidden -->
            <div class="absolute left-[-9999px] size-0 overflow-hidden" aria-hidden="true">
                <input
                    v-model="form.website"
                    type="text"
                    tabindex="-1"
                    autocomplete="off"
                    name="website"
                    data-test="contact-website"
                />
            </div>
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
                v-bind="fieldErrorProps(showFormErrors ? (formErrors.email ?? []) : [])"
                class="mb-2"
            />
            <v-text-field
                v-model="form.subject"
                type="text"
                data-test="contact-subject"
                :label="t('contact-page.label-subject')"
                v-bind="fieldErrorProps(showFormErrors ? (formErrors.subject ?? []) : [])"
                class="mb-2"
            />
            <v-select
                v-model="form.category"
                data-test="contact-category"
                :label="t('contact-page.label-category')"
                :items="categoryOptions"
                item-title="title"
                item-value="value"
                class="mb-2"
            />
            <v-text-field
                v-model="form.orderNumber"
                type="text"
                :maxlength="orderNumberMax"
                data-test="contact-order-number"
                :label="t('contact-page.label-order-number')"
                class="mb-2"
            />
            <v-textarea
                v-model="form.message"
                data-test="contact-message"
                :label="t('contact-page.label-message')"
                v-bind="fieldErrorProps(showFormErrors ? (formErrors.message ?? []) : [])"
                rows="5"
            />
            <HumanCheck ref="humanCheck" class="mb-2" />
            <template #after-submit>
                <InlineErrorAlert
                    :message="submitError"
                    class="mt-2"
                    data-test="contact-submit-error"
                />
            </template>
        </FormCard>
    </div>
</template>
