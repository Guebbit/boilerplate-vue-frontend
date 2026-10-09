<script setup lang="ts">
/**
 * @module
 * Dialog component: a schema-validated form (via `useStructureFormValidation`) that resets its fields on every
 * open and emits the saved fields upward — no store access, and no error handling, of its own.
 *
 * Slots: `error` — the parent's own save can fail after this form already validated clean (a
 * duplicate key, a transport failure); the parent renders its `InlineErrorAlert` here, above the
 * buttons, since this dialog has no opinion of its own on what a blocked save looks like.
 */
import { watch, computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { localesEntrySchema } from '../schemas.ts';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import type { LocaleAppDescriptor } from '@types';

/**
 * The "add one entry" dialog. Only adding: a stored entry's key is immutable and its value edits
 * inline in the table, so a row never comes back through here.
 */
const props = defineProps<{
    /**
     * The apps the API serves, from its registry — what the select offers.
     */
    apps: LocaleAppDescriptor[];
    /**
     * The app preselected on open — whatever the page's app filter is on.
     */
    initialApp?: string;
    /**
     * Whether the parent's save is in flight — the submit is disabled meanwhile, so Enter or a
     * second click cannot send the write twice.
     */
    saving?: boolean;
}>();

/**
 * Emits the saved fields upward on submit — no store access of its own.
 */
const emit = defineEmits<{
    save: [fields: { app: string; key: string; value: string }];
}>();

/**
 * Two-way `v-model`, so the dialog neither declares the prop nor re-emits the event by hand.
 */
const isOpen = defineModel<boolean>({ required: true });

/**
 * Translation function and current locale, the latter re-triggering validation on change.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher for the "fix the form's errors" notice.
 */
const { addMessage } = useNotificationsStore();

/**
 * Whether the dialog fills the screen — it does on a phone, see `useFullscreenDialog`.
 */
const fullscreen = useFullscreenDialog();

/**
 * Hands focus back to the control that opened the entry dialog once it closes.
 */
useReturnFocus(() => isOpen.value);

/**
 * The heading's id, so the dialog is announced by its title rather than as "dialog".
 */
const titleId = useId();

/**
 * The first app the registry lists — the default when the page has no filter on.
 */
const defaultApp = computed(() => props.initialApp ?? props.apps.at(0)?.id ?? '');

/**
 * Field state, errors and submit gating, validated against {@link localesEntrySchema}.
 */
const { form, formErrors, showFormErrors, handleSubmit, setForm, applyServerErrors } =
    useStructureFormValidation({ app: '', key: '', value: '' }, localesEntrySchema, {
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    });

/*
 * Refill on every open rather than on mount: the dialog is a single instance the page reuses, so
 * yesterday's values must not leak into today's add.
 */
watch(isOpen, (open) => {
    if (!open) return;
    setForm({ app: defaultApp.value, key: '', value: '' });
});

/**
 * The select's options, from the apps the API's registry serves.
 */
const appOptions = computed(() =>
    props.apps.map(({ id, label }) => ({ value: id, title: `${label} (${id})` }))
);

/**
 * Validates and emits, or shows the form's errors — `handleSubmit`'s job either way.
 */
const handleSave = () =>
    handleSubmit(({ app, key, value }) => {
        emit('save', { app, key, value });
    });

/**
 * The parent's save fails after this form validated clean (a duplicate key names `key`); a
 * refusal that names one of its fields is put on that field through this, and the parent blocks
 * the dialog only when it returns false.
 */
defineExpose({ applyServerErrors });
</script>

<template>
    <v-dialog v-model="isOpen" max-width="560" :fullscreen="fullscreen" :aria-labelledby="titleId">
        <v-card class="p-5" data-test="entry-form">
            <h2 :id="titleId" class="mb-4 text-lg font-semibold">{{ t('entry-form.title') }}</h2>
            <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSave">
                <v-select
                    v-model="form.app"
                    :items="appOptions"
                    :label="t('entry-form.label-app')"
                    :error-messages="showFormErrors ? (formErrors.app ?? []) : []"
                    data-test="entry-app"
                />
                <v-text-field
                    v-model="form.key"
                    :label="t('entry-form.label-key')"
                    :hint="t('entry-form.hint-key')"
                    :error-messages="showFormErrors ? (formErrors.key ?? []) : []"
                    persistent-hint
                    class="font-mono"
                    data-test="entry-key"
                />
                <v-textarea
                    v-model="form.value"
                    :label="t('entry-form.label-value')"
                    :error-messages="showFormErrors ? (formErrors.value ?? []) : []"
                    rows="2"
                    auto-grow
                    data-test="entry-value"
                />
                <slot name="error" />

                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" @click="isOpen = false">
                        {{ t('entry-form.button-cancel') }}
                    </v-btn>
                    <!--
                        Never disabled on validity: a submit that cannot be pressed explains
                        nothing, while `handleSubmit` shows the messages and says so.
                    -->
                    <v-btn
                        type="submit"
                        color="primary"
                        data-test="entry-save"
                        :loading="saving"
                        :disabled="saving"
                    >
                        {{ t('entry-form.button-save') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </v-dialog>
</template>
