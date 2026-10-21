<script setup lang="ts">
/**
 * @module
 * The right-hand summary card of a detail or edit page: an accent tile with the record's title,
 * then one labelled row per entry of `fields`, then whatever the default slot adds. It knows
 * nothing about the record — labels and values arrive already translated and formatted, so any
 * module can feed it.
 */
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import type { DetailFieldRow, ThemeAccent } from '@/ui/types.ts';

/**
 * Component props — see each field's own doc comment below.
 */
defineProps<{
    /**
     * The tile's title.
     */
    title: string;
    /**
     * The tile's body text.
     */
    description: string;
    /**
     * Theme accent of the icon tile; `CardInfo` defaults it to `primary`.
     */
    accent?: ThemeAccent;
    /**
     * The labelled rows under the tile, in order.
     */
    fields?: DetailFieldRow[];
}>();

/**
 * The slots: the tile's icon, and extra content after the rows.
 */
defineSlots<{
    /**
     * The icon inside the accent tile; `CardInfo` falls back to its own.
     */
    icon?(): unknown;
    /**
     * Content rendered after the rows.
     */
    default?(): unknown;
}>();
</script>

<template>
    <CardDetail as="aside" class="flex flex-col gap-4">
        <CardInfo :title="title" :description="description" :accent="accent">
            <template v-if="$slots.icon" #icon><slot name="icon" /></template>
        </CardInfo>
        <ItemDetailField
            v-for="row in fields"
            :key="row.label"
            :label="row.label"
            :value="row.value"
            :icon="row.icon"
            :data-test="row.test"
        />
        <slot />
    </CardDetail>
</template>
