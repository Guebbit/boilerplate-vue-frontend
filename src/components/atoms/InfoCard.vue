<template>
    <VCard tag="article" class="d-flex align-center ga-4 pa-4" hover>
        <VAvatar :color="resolvedVariant" size="64" rounded="lg">
            <VIcon icon="$star" size="32" />
        </VAvatar>
        <div>
            <h3 class="text-h6 mb-1">{{ props.title }}</h3>
            <p class="text-body-2 text-medium-emphasis ma-0">{{ props.description }}</p>
        </div>
    </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VCard, VAvatar, VIcon } from 'vuetify/components';

/*
 * Decorative info card: colored avatar + title + description.
 * @param variant - maps to a theme color (primary/secondary/tertiary)
 */
const props = defineProps<{
    title: string;
    description: string;
    variant?: 'primary' | 'secondary' | 'tertiary';
}>();

/*
 * Maps the "tertiary" variant (not in the Vuetify palette) to "info".
 */
const resolvedVariant = computed(() => {
    const variant = props.variant ?? 'primary';
    return variant === 'tertiary' ? 'info' : variant;
});
</script>
