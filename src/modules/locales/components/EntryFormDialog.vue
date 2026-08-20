<script setup lang="ts">
import { watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import { localesEntrySchema } from '@/modules/locales/schemas.ts';
import { LocaleScope } from '@types';
import type { LocaleScope as TLocaleScope } from '@types';

/**
 * The "add one entry" dialog. Only adding: a stored entry's key is immutable and its value edits
 * inline in the table, so a row never comes back through here.
 */
const props = defineProps<{
    /** The scope preselected on open — whatever the page's scope filter is on. */
    initialScope?: TLocaleScope;
}>();

const emit = defineEmits<{
    save: [fields: { scope: TLocaleScope; key: string; value: string }];
}>();

/** Two-way `v-model`, so the dialog neither declares the prop nor re-emits the event by hand. */
const isOpen = defineModel<boolean>({ required: true });

const { t } = useI18n();

const { form, formErrors, showFormErrors, isValid, handleSubmit, setForm } = useAppForm(
    { scope: LocaleScope.app, key: '', value: '' },
    localesEntrySchema
);

/*
 * Refill on every open rather than on mount: the dialog is a single instance the page reuses, so
 * yesterday's values must not leak into today's add.
 */
watch(isOpen, (open) => {
    if (!open) return;
    setForm({ scope: props.initialScope ?? LocaleScope.app, key: '', value: '' });
});

const scopeOptions = computed(() =>
    Object.values(LocaleScope).map((option) => ({
        value: option,
        title: t(`locale-entries-page.scope-${option}`)
    }))
);

const handleSave = () =>
    handleSubmit(({ scope, key, value }) => {
        emit('save', { scope, key, value });
    });
</script>

<template>
    <v-dialog v-model="isOpen" max-width="560">
        <v-card class="p-5" data-test="entry-form">
            <h3 class="mb-4 text-lg font-semibold">{{ t('entry-form.title') }}</h3>
            <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSave">
                <v-select
                    v-model="form.scope"
                    :items="scopeOptions"
                    :label="t('entry-form.label-scope')"
                    hide-details
                    data-test="entry-scope"
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
                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" @click="isOpen = false">
                        {{ t('entry-form.button-cancel') }}
                    </v-btn>
                    <v-btn
                        type="submit"
                        color="primary"
                        :disabled="!isValid"
                        data-test="entry-save"
                    >
                        {{ t('entry-form.button-save') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </v-dialog>
</template>
