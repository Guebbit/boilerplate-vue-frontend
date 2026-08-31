<script setup lang="ts">
/**
 * @module
 * Dialog component: local form state plus a pure computed parse of the pasted/uploaded JSON,
 * emitting the flattened rows upward on submit rather than writing anything itself.
 */
import { ref, watch, computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LocaleEntryInput, LocaleTenantDescriptor } from '@types';
import type { TranslationDictionaries } from '@/infrastructure/i18n';
import { flattenDictionary } from '../dictionaries';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

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
    /**
     * The tenants the API serves, from its registry — what the select offers.
     */
    tenants: LocaleTenantDescriptor[];
    /**
     * The tenant preselected on open.
     */
    initialTenant?: string;
}>();

const emit = defineEmits<{
    import: [payload: { mode: 'merge' | 'replace'; tenant: string; entries: LocaleEntryInput[] }];
}>();

/**
 * Two-way `v-model`, so the dialog neither declares the prop nor re-emits the event by hand.
 */
const isOpen = defineModel<boolean>({ required: true });

const { t } = useI18n();

/*
 * Deliberately NOT on `useStructureFormValidation`, unlike the two form dialogs beside it. What this validates is
 * a JSON document, and the useful result is the ROWS it parsed to — data the preview below
 * renders — not a per-field error. A schema would have to carry the parse through a transform to
 * hand back the same thing `parsed` already does.
 */

/**
 * Ids for the dialog's name and for the parse error both inputs point at.
 */
const titleId = useId();
const errorId = useId();

/**
 * The selected destination tenant.
 */
const tenant = ref('');

/**
 * `merge` upserts and deletes nothing; `replace` makes the tenant exactly what is sent.
 */
const mode = ref<'merge' | 'replace'>('merge');

/**
 * The pasted or file-read JSON text, parsed by {@link parsed}.
 */
const rawJson = ref('');

watch(isOpen, (open) => {
    if (!open) return;
    tenant.value = props.initialTenant ?? props.tenants.at(0)?.id ?? '';
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

/**
 * The parse outcome: rows when the JSON is a non-empty dictionary, the reason it is not otherwise.
 */
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

/**
 * The rows to submit, when the pasted text parsed cleanly.
 */
const parsedEntries = computed(() => parsed.value.entries);

/**
 * The reason the pasted text did not parse, when it did not.
 */
const parseError = computed(() => parsed.value.error);

/**
 * The radio's two options, worded with the contract's own words.
 */
const modeOptions = computed(() => [
    { value: 'merge', label: t('entries-import.mode-merge') },
    { value: 'replace', label: t('entries-import.mode-replace') }
]);

/**
 * Confirms a replace before emitting, then hands the parsed rows up.
 */
const handleImport = () => {
    const entries = parsedEntries.value;
    if (!entries) return;
    // The second look a replace deserves, naming the tenant it is allowed to delete from.
    const secondLook =
        mode.value === 'replace'
            ? useDialogStore().confirm({
                  message: t('entries-import.confirm-replace', {
                      tenant: tenant.value,
                      count: entries.length
                  }),
                  color: 'error'
              })
            : Promise.resolve(true);
    return secondLook.then((accepted) => {
        if (!accepted) return;
        emit('import', { mode: mode.value, tenant: tenant.value, entries });
    });
};
</script>

<template>
    <v-dialog v-model="isOpen" max-width="640" :aria-labelledby="titleId">
        <v-card class="p-5" data-test="entries-import">
            <h2 :id="titleId" class="mb-1 text-lg font-semibold">
                {{ t('entries-import.title') }}
            </h2>
            <p class="mb-4 text-sm opacity-70">{{ t('entries-import.intro') }}</p>

            <form novalidate class="flex flex-col gap-3" @submit.prevent="handleImport">
                <!--
                    One fieldset for the two ways in: a file lands in the paste area, and the
                    parse error below speaks for either — so BOTH inputs point at it, and a reader
                    on the file picker hears why its file was refused.
                -->
                <fieldset class="flex flex-col gap-3 border-0 p-0">
                    <legend class="mb-2 text-sm font-medium">
                        {{ t('entries-import.legend-source') }}
                    </legend>
                    <v-file-input
                        :label="t('entries-import.label-file')"
                        accept=".json,application/json"
                        density="compact"
                        :aria-describedby="parseError ? errorId : undefined"
                        :aria-invalid="parseError ? 'true' : undefined"
                        data-test="import-file"
                        @update:model-value="handleFile"
                    />
                    <v-textarea
                        v-model="rawJson"
                        :label="t('entries-import.label-json')"
                        :aria-describedby="parseError ? errorId : undefined"
                        :aria-invalid="parseError ? 'true' : undefined"
                        rows="6"
                        class="font-mono"
                        data-test="import-json"
                    />
                    <p
                        v-if="parseError"
                        :id="errorId"
                        class="m-0 text-sm text-error"
                        role="alert"
                        data-test="import-error"
                    >
                        {{ parseError }}
                    </p>
                </fieldset>
                <div class="flex flex-wrap items-start gap-4">
                    <v-select
                        v-model="tenant"
                        :items="
                            tenants.map(({ id, label }) => ({
                                value: id,
                                title: `${label} (${id})`
                            }))
                        "
                        :label="t('entries-import.label-tenant')"
                        hide-details
                        class="max-w-72"
                        data-test="import-tenant"
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
