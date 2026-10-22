<script setup lang="ts">
/**
 * @module
 * The bare card shell every detail-page card (`ItemDetailHero`, stat tiles, the main content
 * card) renders through. `inheritAttrs: false` plus `v-bind="$attrs"` on the `v-card` lets a
 * caller pass through classes/attributes without them also landing on the wrapping element.
 * An optional `title` (and `subtitle`, and a `#title-actions` slot beside them) renders the heading
 * every detail and edit page opens its main card with.
 */

/**
 * Lets a caller's classes/attributes land on the `v-card` itself rather than this
 * wrapper — see the module doc above.
 */
defineOptions({ inheritAttrs: false });

/**
 * Component props — see the field's own doc comment below.
 */
const { as, title, subtitle } = defineProps<{
    /**
     * Semantic tag for the card's root element. Defaults to `article`.
     */
    as?: 'article' | 'aside' | 'div' | 'section';
    /**
     * Heading of the card. No heading block renders without it.
     */
    title?: string;
    /**
     * Line under the heading.
     */
    subtitle?: string;
}>();

/**
 * The slots: the card's content, and controls beside the heading.
 */
defineSlots<{
    /**
     * The card's content, after the heading.
     */
    default?(): unknown;
    /**
     * Controls laid out at the end of the heading row.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention -- slot names are kebab-case in templates (`#title-actions`)
    'title-actions'?(): unknown;
}>();
</script>

<template>
    <v-card :tag="as ?? 'article'" variant="flat" border class="p-6" v-bind="$attrs">
        <div v-if="title" class="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
                <h3 class="text-lg font-semibold">{{ title }}</h3>
                <p v-if="subtitle" class="mt-1 opacity-75">{{ subtitle }}</p>
            </div>
            <slot name="title-actions" />
        </div>
        <slot />
    </v-card>
</template>
