<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LocaleScope } from '@types';
import type { LocaleScope as TLocaleScope, LocaleEntryInput } from '@types';
import type { TranslationDictionaries } from '@/infrastructure/i18n';
import { flattenDictionary } from '../dictionaries';

/**
 * The import dialog: a nested JSON dictionary in, flat rows out.
 *
 * Accepts the shape `src/locales/*.json` are in, so a translator can round-trip a bundled file,
 * and flattens it before emitting. The merge/replace choice is worded with the contract's own
 * words — the METHOD carries the semantics server-side, and this radio is the last place a person
 * can pick the wrong one, so "what is not sent is DELETED" is written on the option itself and
 * confirmed once more before a replace fires.
 */
const props = defineProps<{
    /** The scope preselected on open. */
    initialScope?: TLocaleScope;
}>();

const emit = defineEmits<{
    import: [
        payload: { mode: 'merge' | 'replace'; scope: TLocaleScope; entries: LocaleEntryInput[] }
    ];
}>();

/** Two-way `v-model`, so the dialog neither declares the prop nor re-emits the event by hand. */
const isOpen = defineModel<boolean>({ required: true });

const { t } = useI18n();

/*
 * Deliberately NOT on `useAppForm`, unlike the two form dialogs beside it. What this validates is
 * a JSON document, and the useful result is the ROWS it parsed to — data the preview below
 * renders — not a per-field error. A schema would have to carry the parse through a transform to
 * hand back the same thing `parsed` already does.
 */

const scope = ref<TLocaleScope>(LocaleScope.app);
const mode = ref<'merge' | 'replace'>('merge');
const rawJson = ref('');

watch(isOpen, (open) => {
    if (!open) return;
    scope.value = props.initialScope ?? LocaleScope.app;
    mode.value = 'merge';
    rawJson.value = '';
});

/**
 * Reads a picked file into the paste area, so both inputs land in the same place and the preview
 * below speaks for either.
 *
 * @param file - The picked `.json` file, or null when the picker was cleared.
 */
const handleFile = (file: File | File[] | null) => {
    const single = Array.isArray(file) ? file[0] : file;
    if (!single) return;
    return single.text().then((content) => {
        rawJson.value = content;
    });
};

/** The parse outcome: rows when the JSON is a non-empty dictionary, the reason it is not otherwise. */
const parsed = computed<{ entries?: LocaleEntryInput[]; error?: string }>(() => {
    if (rawJson.value.trim() === '') return {};
    // eslint-disable-next-line no-restricted-syntax -- JSON.parse has no non-throwing form; the catch turns hand-typed JSON into a form error
    try {
        const dictionary: unknown = JSON.parse(rawJson.value);
        if (typeof dictionary !== 'object' || dictionary === null || Array.isArray(dictionary))
            return { error: t('entries-import.error-parse') };
        const entries = flattenDictionary(dictionary as TranslationDictionaries);
        if (entries.length === 0) return { error: t('entries-import.error-empty') };
        return { entries };
    } catch {
        return { error: t('entries-import.error-parse') };
    }
});

const parsedEntries = computed(() => parsed.value.entries);
const parseError = computed(() => parsed.value.error);

const modeOptions = computed(() => [
    { value: 'merge', label: t('entries-import.mode-merge') },
    { value: 'replace', label: t('entries-import.mode-replace') }
]);

const handleImport = () => {
    const entries = parsedEntries.value;
    if (!entries) return;
    // The second look a replace deserves, naming the scope it is allowed to delete from.
    if (
        mode.value === 'replace' &&
        !globalThis.confirm(
            t('entries-import.confirm-replace', { scope: scope.value, count: entries.length })
        )
    )
        return;
    emit('import', { mode: mode.value, scope: scope.value, entries });
};
</script>

<template>
    <v-dialog v-model="isOpen" max-width="640">
        <v-card class="p-5" data-test="entries-import">
            <h3 class="mb-1 text-lg font-semibold">{{ t('entries-import.title') }}</h3>
            <p class="mb-4 text-sm opacity-70">{{ t('entries-import.intro') }}</p>

            <form novalidate class="flex flex-col gap-3" @submit.prevent="handleImport">
                <v-file-input
                    :label="t('entries-import.label-file')"
                    accept=".json,application/json"
                    density="compact"
                    data-test="import-file"
                    @update:model-value="handleFile"
                />
                <v-textarea
                    v-model="rawJson"
                    :label="t('entries-import.label-json')"
                    :error-messages="parseError"
                    rows="6"
                    class="font-mono"
                    data-test="import-json"
                />
                <div class="flex flex-wrap items-start gap-4">
                    <v-select
                        v-model="scope"
                        :items="
                            Object.values(LocaleScope).map((option) => ({
                                value: option,
                                title: t(`locale-entries-page.scope-${option}`)
                            }))
                        "
                        :label="t('entries-import.label-scope')"
                        hide-details
                        class="max-w-72"
                        data-test="import-scope"
                    />
                    <v-radio-group
                        v-model="mode"
                        :label="t('entries-import.label-mode')"
                        hide-details
                        data-test="import-mode"
                    >
                        <v-radio
                            v-for="option in modeOptions"
                            :key="option.value"
                            :value="option.value"
                            :label="option.label"
                        />
                    </v-radio-group>
                </div>

                <p v-if="parsedEntries" class="text-sm text-success" data-test="import-preview">
                    {{ t('entries-import.preview-count', { count: parsedEntries.length }) }}
                </p>

                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" @click="isOpen = false">
                        {{ t('entries-import.button-cancel') }}
                    </v-btn>
                    <v-btn
                        type="submit"
                        color="primary"
                        :disabled="!parsedEntries"
                        data-test="import-submit"
                    >
                        {{ t('entries-import.button-import') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </v-dialog>
</template>
