<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LocaleCapability, LocaleDirection } from '@types';

/**
 * Create-or-edit dialog for one language.
 *
 * One component for both because the two forms differ in exactly one field: the tag, writable on
 * create and shown disabled on edit — it is what every entry references, so the API keeps it
 * immutable and this dialog says so rather than hiding it.
 */
const props = defineProps<{
    modelValue: boolean;
    /** The language being edited; absent means the dialog creates one. */
    language?: LocaleCapability;
}>();

const emit = defineEmits<{
    'update:modelValue': [open: boolean];
    /** The saved fields; `tag` is only meaningful on create. */
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

const { t } = useI18n();

const tag = ref('');
const name = ref('');
const nativeName = ref('');
const direction = ref<LocaleDirection>('ltr');
const active = ref(true);

const isEdit = computed(() => props.language !== undefined);

/*
 * Refill on every open rather than on mount: the dialog is a single instance the page reuses, so
 * yesterday's values must not leak into today's create.
 */
watch(
    () => props.modelValue,
    (open) => {
        if (!open) return;
        tag.value = props.language?.tag ?? '';
        name.value = props.language?.name ?? '';
        nativeName.value = props.language?.nativeName ?? '';
        direction.value = props.language?.direction ?? 'ltr';
        active.value = props.language?.active ?? true;
    }
);

const directionOptions = computed(() => [
    { value: 'ltr', title: t('locales-list-page.direction-ltr') },
    { value: 'rtl', title: t('locales-list-page.direction-rtl') }
]);

/** BCP 47 as the contract accepts it: primary subtag, optional region. */
const TAG_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

const tagError = computed(() => {
    if (isEdit.value) return undefined;
    if (tag.value === '') return t('locale-form.tag-required');
    if (!TAG_PATTERN.test(tag.value)) return t('locale-form.tag-invalid');
    return undefined;
});
const nameError = computed(() => (name.value === '' ? t('locale-form.name-required') : undefined));
const nativeNameError = computed(() =>
    nativeName.value === '' ? t('locale-form.native-name-required') : undefined
);

const isValid = computed(() => !tagError.value && !nameError.value && !nativeNameError.value);

const handleSave = () => {
    if (!isValid.value) return;
    emit('save', {
        tag: tag.value,
        name: name.value,
        nativeName: nativeName.value,
        direction: direction.value,
        active: active.value
    });
};
</script>

<template>
    <v-dialog
        :model-value="modelValue"
        max-width="480"
        @update:model-value="(open) => emit('update:modelValue', open)"
    >
        <v-card class="p-5" data-test="language-form">
            <h3 class="mb-1 text-lg font-semibold">
                {{ isEdit ? t('locale-form.title-edit') : t('locale-form.title-create') }}
            </h3>
            <p v-if="!isEdit" class="mb-4 text-sm opacity-70">
                {{ t('locale-form.hint-create') }}
            </p>

            <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSave">
                <v-text-field
                    v-model="tag"
                    :label="t('locale-form.label-tag')"
                    :hint="t('locale-form.hint-tag')"
                    :disabled="isEdit"
                    :error-messages="tagError"
                    persistent-hint
                    data-test="language-tag"
                />
                <v-text-field
                    v-model="name"
                    :label="t('locale-form.label-name')"
                    :error-messages="nameError"
                    data-test="language-name"
                />
                <v-text-field
                    v-model="nativeName"
                    :label="t('locale-form.label-native-name')"
                    :error-messages="nativeNameError"
                    data-test="language-native-name"
                />
                <v-select
                    v-model="direction"
                    :items="directionOptions"
                    :label="t('locale-form.label-direction')"
                    hide-details
                />
                <v-switch
                    v-model="active"
                    :label="t('locale-form.label-active')"
                    :hint="t('locale-form.hint-active')"
                    persistent-hint
                    color="primary"
                    data-test="language-active"
                />
                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" @click="emit('update:modelValue', false)">
                        {{ t('locale-form.button-cancel') }}
                    </v-btn>
                    <v-btn
                        type="submit"
                        color="primary"
                        :disabled="!isValid"
                        data-test="language-save"
                    >
                        {{ t('locale-form.button-save') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </v-dialog>
</template>
