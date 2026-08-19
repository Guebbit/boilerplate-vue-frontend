<script setup lang="ts">
import { RouterView } from 'vue-router';

/**
 * The composition root, and deliberately empty.
 *
 * Everything a running application needs is installed in `src/main.ts` (pinia, the router, i18n,
 * vuetify) or contributed by a module through `src/kernel/registry.ts`. Nothing that belongs to
 * one domain belongs here: this is the file every derived project opens first, and state parked
 * in it outlives the folder it came from.
 */
</script>

<template>
    <RouterView />
</template>
