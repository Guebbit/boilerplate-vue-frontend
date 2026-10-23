<script setup lang="ts">
/**
 * @module
 * An audit row's `metadata` as an expandable detail: every key as a label and a value, and the
 * `changes` object (field → `{ from, to }`, what an update moved) as its own small table. Generic
 * on purpose — it reads no action name, so a new audited action shows its extras without a change
 * here. Renders nothing for a row with no metadata.
 */
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * The entry's `metadata`, as the API returns it: an open object.
 */
const { metadata } = defineProps<{
    metadata?: Record<string, unknown>;
}>();

/**
 * i18n translator for this component's template.
 */
const { t } = useI18n();

/**
 * Whether the detail is open.
 */
const open = ref(false);

/**
 * Ties the toggle to the region it opens.
 */
const regionId = useId();

/**
 * One field an update moved.
 */
interface FieldChange {
    field: string;
    from: string;
    to: string;
}

/**
 * Shows any metadata value as text: strings as they are, everything else as compact JSON, `null`
 * (an unset field) as a dash.
 *
 * @param value - A value from the open metadata object.
 */
const display = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    return typeof value === 'string' ? value : JSON.stringify(value);
};

/**
 * Whether a value has the shape of one field's change.
 *
 * @param value - A value from the `changes` object.
 */
const isChange = (value: unknown): value is { from?: unknown; to?: unknown } =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The `changes` entry as table rows, in the order the API listed them. Empty when the entry has
 * none, or when it is not an object of `{ from, to }`.
 */
const changes = computed<FieldChange[]>(() => {
    const raw = metadata?.changes;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return [];
    return Object.entries(raw as Record<string, unknown>)
        .filter(([, change]) => isChange(change))
        .map(([field, change]) => ({
            field,
            from: display((change as { from?: unknown }).from),
            to: display((change as { to?: unknown }).to)
        }));
});

/**
 * Every other key, as label/value pairs. `changes` has its own table.
 */
const pairs = computed(() =>
    Object.entries(metadata ?? {})
        .filter(([key]) => key !== 'changes' || changes.value.length === 0)
        .map(([key, value]) => ({ key, value: display(value) }))
);
</script>

<template>
    <div v-if="pairs.length > 0 || changes.length > 0" class="mt-1">
        <v-btn
            size="x-small"
            variant="text"
            data-test="audit-details-toggle"
            :aria-expanded="open ? 'true' : 'false'"
            :aria-controls="regionId"
            @click="open = !open"
        >
            {{ open ? t('admin-page.audit-details-hide') : t('admin-page.audit-details-show') }}
        </v-btn>

        <div v-show="open" :id="regionId" class="mt-2 text-sm" data-test="audit-details">
            <dl v-if="pairs.length > 0" class="m-0 flex flex-col gap-1">
                <div v-for="pair in pairs" :key="pair.key" class="flex flex-wrap gap-x-2">
                    <dt class="font-semibold">{{ pair.key }}</dt>
                    <dd class="m-0 break-all">{{ pair.value }}</dd>
                </div>
            </dl>

            <table
                v-if="changes.length > 0"
                class="mt-2 w-full text-left"
                data-test="audit-changes"
            >
                <caption class="text-left font-semibold">
                    {{
                        t('admin-page.audit-details-changes')
                    }}
                </caption>
                <thead>
                    <tr>
                        <th scope="col">{{ t('admin-page.audit-details-field') }}</th>
                        <th scope="col">{{ t('admin-page.audit-details-from') }}</th>
                        <th scope="col">{{ t('admin-page.audit-details-to') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="change in changes" :key="change.field">
                        <th scope="row" class="font-normal">{{ change.field }}</th>
                        <td class="break-all">{{ change.from }}</td>
                        <td class="break-all">{{ change.to }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
