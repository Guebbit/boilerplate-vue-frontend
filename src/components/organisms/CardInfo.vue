<template>
    <VCard class="info-card d-flex align-center ga-4 pa-4" hover>
        <VAvatar :color="resolvedVariant" size="84" rounded="lg">
            <slot name="icon">
                <VIcon icon="$info" size="28" />
            </slot>
        </VAvatar>
        <div>
            <h3 class="text-h6 mb-1">{{ title }}</h3>
            <p class="text-body-2 text-medium-emphasis ma-0">{{ description }}</p>
        </div>
    </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VCard, VAvatar, VIcon } from 'vuetify/components';

/*
 * Info card: colored avatar (icon slot) + title + description.
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
