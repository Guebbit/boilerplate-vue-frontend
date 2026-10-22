<script setup lang="ts">
/**
 * @module
 * The "Deleted" marker a soft-deletable list (products, users, orders) wears on a row whose
 * `deletedAt` is set. The caller decides when it shows; this only fixes how it looks and its
 * `row-deleted` test hook.
 */
import { useI18n } from 'vue-i18n';

/**
 * Translation function, for the generic label.
 */
const { t } = useI18n();
</script>

<template>
    <v-chip size="small" variant="tonal" color="warning" class="ml-1" data-test="row-deleted">
        {{ t('generic.deleted') }}
    </v-chip>
</template>
