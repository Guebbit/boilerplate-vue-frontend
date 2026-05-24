<template>
    <component :is="as ?? 'div'" class="theme-card" v-bind="$attrs">
        <slot />
    </component>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{
    as?: string;
}>();
</script>
