<template>
    <VCard
        tag="article"
        class="item-detail-field d-flex align-start ga-3 pa-4"
        :class="{ 'item-detail-field-full-width': props.fullWidth }"
        variant="outlined"
    >
        <VAvatar v-if="props.icon" color="primary" variant="tonal" rounded="lg" aria-hidden="true">
            <VIcon v-if="isVuetifyIcon" :icon="props.icon" />
            <span v-else>{{ props.icon }}</span>
        </VAvatar>
        <div class="item-detail-field-content flex-grow-1" style="min-width: 0">
            <p class="item-detail-field-label text-overline ma-0">{{ props.label }}</p>
            <div class="item-detail-field-value text-body-1 mt-1" style="overflow-wrap: anywhere">
                <slot>{{ displayValue }}</slot>
            </div>
        </div>
    </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VCard, VAvatar, VIcon } from 'vuetify/components';
import { EMPTY_VALUE } from '@/utils/constants.ts';

/*
 * Atomic read-only field used by detail pages to render one label/value pair.
 * @param icon - Vuetify icon name (e.g. "$pencil" or "custom:my-logo")
 */
const props = defineProps<{
    label: string;
    value?: string | number | null;
    icon?: string;
    fullWidth?: boolean;
}>();

/*
 * Normalizes empty-like values to a single fallback glyph.
 */
const displayValue = computed(() => {
    if (props.value === undefined || props.value === null || props.value === '') return EMPTY_VALUE;
    return String(props.value);
});

/*
 * True when the icon is a Vuetify icon name ("$alias", "mdi..." or "custom:name"),
 * false for plain text/emoji glyphs.
 */
const isVuetifyIcon = computed(
    () =>
        !!props.icon &&
        (props.icon.startsWith('$') || props.icon.startsWith('mdi') || props.icon.includes(':'))
);
</script>
