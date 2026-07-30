<template>
    <v-card :tag="as ?? 'article'" variant="flat" border class="p-6" v-bind="$attrs">
        <slot />
    </v-card>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{
    as?: 'article' | 'aside' | 'div' | 'section';
}>();
</script>
