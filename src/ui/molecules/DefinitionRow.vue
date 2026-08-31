<script setup lang="ts">
/**
 * @module
 * One label/value row of a `<dl>`: a dense underlined row for a panel listing a dozen facts at
 * once. `ItemDetailField` is the other shape — a bordered tile with an icon, for a detail page.
 *
 * The value is a slot so a caller can colour or wrap it without this component learning why.
 */
defineProps<{
    /**
     * Already-translated label; this component does no i18n of its own.
     */
    label: string;
}>();
</script>

<template>
    <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
        <dt class="opacity-70">{{ label }}</dt>
        <dd class="font-medium"><slot /></dd>
    </div>
</template>
