<script setup lang="ts">
/**
 * @module
 * The page hero. A view whose title is not simply `route.meta.title` translated (a dynamic one, or
 * richer markup entirely) renders this itself, at the top of its own body. `meta.customHero: true`
 * on its route tells `LayoutDefault` to stay out of the way.
 */

/**
 * Component props — see each field's own doc comment below.
 */
defineProps<{
    /**
     * The hero's title text, when the default slot is not overridden.
     */
    title?: string;
}>();
</script>

<template>
    <header class="py-8 lg:py-10">
        <div class="mx-auto w-full max-w-7xl px-4">
            <slot>
                <h1 class="text-3xl font-bold tracking-tight lg:text-4xl">
                    {{ title }}
                </h1>
                <div
                    class="mt-3 h-1 w-16 rounded-full bg-linear-to-r from-primary to-tertiary"
                    aria-hidden="true"
                />
            </slot>
        </div>
    </header>
</template>
