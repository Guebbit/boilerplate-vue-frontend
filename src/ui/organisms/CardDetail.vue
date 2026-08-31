<script setup lang="ts">
/**
 * @module
 * The bare card shell every detail-page card (`ItemDetailHero`, stat tiles, the main content
 * card) renders through. `inheritAttrs: false` plus `v-bind="$attrs"` on the `v-card` lets a
 * caller pass through classes/attributes without them also landing on the wrapping element.
 */

/**
 * Lets a caller's classes/attributes land on the `v-card` itself rather than this
 * wrapper — see the module doc above.
 */
defineOptions({ inheritAttrs: false });

/**
 * Component props — see the field's own doc comment below.
 */
defineProps<{
    /**
     * Semantic tag for the card's root element. Defaults to `article`.
     */
    as?: 'article' | 'aside' | 'div' | 'section';
}>();
</script>

<template>
    <v-card :tag="as ?? 'article'" variant="flat" border class="p-6" v-bind="$attrs">
        <slot />
    </v-card>
</template>
