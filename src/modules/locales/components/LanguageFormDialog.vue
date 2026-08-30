<script setup lang="ts">
/**
 * @module
 * Dialog component: a schema-validated form (via `useAppForm`) that swaps between a create and an
 * edit schema depending on whether a `language` prop was passed, resets on every open, and emits
 * the saved fields upward.
 */
import { watch, computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import { localesLanguageEditSchema, localesLanguageSchema } from '@/modules/locales/schemas.ts';
import type { LocaleCapability, LocaleDirection } from '@types';

/**
 * Create-or-edit dialog for one language.
 *
 * One component for both because the two forms differ in exactly one field: the tag, writable on
 * create and shown disabled on edit — it is what every entry references, so the API keeps it
 * immutable and this dialog says so rather than hiding it.
 */
const props = defineProps<{
    /**
     * The language being edited; absent means the dialog creates one.
     */
    language?: LocaleCapability;
}>();

const emit = defineEmits<{
    /**
     * The saved fields; `tag` is only meaningful on create.
     */
    save: [
        fields: {
            tag: string;
            name: string;
            nativeName: string;
            direction: LocaleDirection;
            active: boolean;
        }
    ];
}>();

/**
 * Two-way `v-model`, so the dialog neither declares the prop nor re-emits the event by hand.
 */
const isOpen = defineModel<boolean>({ required: true });

const { t } = useI18n();

/**
 * Whether the dialog is editing an existing language rather than creating one.
 */
const isEdit = computed(() => props.language !== undefined);

/**
 * The heading's id, so the dialog is announced by its title rather than as "dialog".
 */
const titleId = useId();

/*
 * Two schemas rather than one with a conditional tag rule: editing shows the tag disabled — it is
 * what every entry references, so the API keeps it immutable — and a field that is sometimes
 * required is a field nobody can read the rule of.
 */
const { form, formErrors, showFormErrors, handleSubmit, setForm } = useAppForm<{
    tag: string;
    name: string;
    nativeName: string;
    direction: LocaleDirection;
    active: boolean;
}>(
    { tag: '', name: '', nativeName: '', direction: 'ltr', active: true },
    computed(() => (isEdit.value ? localesLanguageEditSchema : localesLanguageSchema))
);

/*
 * Refill on every open rather than on mount: the dialog is a single instance the page reuses, so
 * yesterday's values must not leak into today's create.
 */
watch(isOpen, (open) => {
    if (!open) return;
    setForm({
        tag: props.language?.tag ?? '',
        name: props.language?.name ?? '',
        nativeName: props.language?.nativeName ?? '',
        direction: props.language?.direction ?? 'ltr',
        active: props.language?.active ?? true
    });
});

/**
 * The direction select's two options.
 */
const directionOptions = computed(() => [
    { value: 'ltr', title: t('locales-list-page.direction-ltr') },
    { value: 'rtl', title: t('locales-list-page.direction-rtl') }
]);

/**
 * Validates and emits, or shows the form's errors — `handleSubmit`'s job either way.
 */
const handleSave = () => handleSubmit((fields) => emit('save', fields));
</script>

<template>
    <v-dialog v-model="isOpen" max-width="480" :aria-labelledby="titleId">
        <v-card class="p-5" data-test="language-form">
            <h2 :id="titleId" class="mb-1 text-lg font-semibold">
                {{ isEdit ? t('locale-form.title-edit') : t('locale-form.title-create') }}
            </h2>
            <p v-if="!isEdit" class="mb-4 text-sm opacity-70">
                {{ t('locale-form.hint-create') }}
            </p>

            <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSave">
                <v-text-field
                    v-model="form.tag"
                    :label="t('locale-form.label-tag')"
                    :hint="t('locale-form.hint-tag')"
                    :disabled="isEdit"
                    :error-messages="showFormErrors ? (formErrors.tag ?? []) : []"
                    persistent-hint
                    data-test="language-tag"
                />
                <v-text-field
                    v-model="form.name"
                    :label="t('locale-form.label-name')"
                    :error-messages="showFormErrors ? (formErrors.name ?? []) : []"
                    data-test="language-name"
                />
                <v-text-field
                    v-model="form.nativeName"
                    :label="t('locale-form.label-native-name')"
                    :error-messages="showFormErrors ? (formErrors.nativeName ?? []) : []"
                    data-test="language-native-name"
                />
                <v-select
                    v-model="form.direction"
                    :items="directionOptions"
                    :label="t('locale-form.label-direction')"
                    hide-details
                />
                <v-switch
                    v-model="form.active"
                    :label="t('locale-form.label-active')"
                    :hint="t('locale-form.hint-active')"
                    persistent-hint
                    color="primary"
                    data-test="language-active"
                />
                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" @click="isOpen = false">
                        {{ t('locale-form.button-cancel') }}
                    </v-btn>
                    <!--
                        Never disabled on validity: a submit that cannot be pressed explains
                        nothing, while `handleSubmit` shows the messages and says so.
                    -->
                    <v-btn type="submit" color="primary" data-test="language-save">
                        {{ t('locale-form.button-save') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </v-dialog>
</template>
