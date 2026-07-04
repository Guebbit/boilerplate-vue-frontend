<template>
    <VOverlay
        class="loading-core align-center justify-center"
        :model-value="true"
        persistent
        contained
    >
        <VProgressCircular indeterminate color="primary" size="64" width="6" />
    </VOverlay>
</template>

<script setup lang="ts">
import { VOverlay, VProgressCircular } from 'vuetify/components';

/*
 * Full-page blocking loader (core loading state).
 */
</script>
