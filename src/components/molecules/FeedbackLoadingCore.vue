<template>
    <div class="loading-core d-flex align-center justify-center bg-surface">
        <VProgressCircular indeterminate color="primary" size="64" width="6" />
    </div>
</template>

<style lang="scss">
.loading-core {
    position: fixed;
    inset: 0;
    z-index: 9999;
}
</style>

<script setup lang="ts">
import { VProgressCircular } from 'vuetify/components';

/*
 * Full-page blocking loader (core loading state).
 * Plain fixed div (no teleport) so parent v-show keeps working.
 */
</script>
