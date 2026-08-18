<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LocaleScope } from '@types';
import type { LocaleScope as TLocaleScope } from '@types';

/**
 * The "add one entry" dialog. Only adding: a stored entry's key is immutable and its value edits
 * inline in the table, so a row never comes back through here.
 */
const props = defineProps<{
    modelValue: boolean;
    /** The scope preselected on open — whatever the page's scope filter is on. */
    initialScope?: TLocaleScope;
}>();

const emit = defineEmits<{
    'update:modelValue': [open: boolean];
    save: [fields: { scope: TLocaleScope; key: string; value: string }];
}>();

const { t } = useI18n();

const scope = ref<TLocaleScope>(LocaleScope.app);
const key = ref('');
const value = ref('');

watch(
    () => props.modelValue,
    (open) => {
        if (!open) return;
        scope.value = props.initialScope ?? LocaleScope.app;
        key.value = '';
        value.value = '';
    }
);

const scopeOptions = computed(() =>
    Object.values(LocaleScope).map((option) => ({
        value: option,
        title: t(`locale-entries-page.scope-${option}`)
    }))
);

const keyError = computed(() => (key.value === '' ? t('entry-form.key-required') : undefined));
const valueError = computed(() =>
    value.value === '' ? t('entry-form.value-required') : undefined
);
const isValid = computed(() => !keyError.value && !valueError.value);

const handleSave = () => {
    if (!isValid.value) return;
    emit('save', { scope: scope.value, key: key.value, value: value.value });
};
</script>

<template>
    <v-dialog
        :model-value="modelValue"
        max-width="560"
        @update:model-value="(open) => emit('update:modelValue', open)"
    >
        <v-card class="p-5" data-test="entry-form">
            <h3 class="mb-4 text-lg font-semibold">{{ t('entry-form.title') }}</h3>
            <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSave">
                <v-select
                    v-model="scope"
                    :items="scopeOptions"
                    :label="t('entry-form.label-scope')"
                    hide-details
                    data-test="entry-scope"
                />
                <v-text-field
                    v-model="key"
                    :label="t('entry-form.label-key')"
                    :hint="t('entry-form.hint-key')"
                    :error-messages="keyError"
                    persistent-hint
                    class="font-mono"
                    data-test="entry-key"
                />
                <v-textarea
                    v-model="value"
                    :label="t('entry-form.label-value')"
                    :error-messages="valueError"
                    rows="2"
                    auto-grow
                    data-test="entry-value"
                />
                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" @click="emit('update:modelValue', false)">
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
