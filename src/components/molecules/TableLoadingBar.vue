<template>
    <v-progress-linear
        absolute
        indeterminate
        height="2"
        color="primary"
        :aria-label="t('generic.loading-state')"
    />
</template>

<script setup lang="ts">
/**
 * The loading bar for a `v-data-table`, supplied through its `#loader` slot.
 *
 * ── Why this exists instead of Vuetify's own ─────────────────────────────────────────────────
 * `v-data-table` renders its own `v-progress-linear` while `loading` is set, and that one carries
 * `role="progressbar"` with no accessible name — announced to a screen reader as an unlabelled
 * control, and a `serious` axe violation on every list screen in the app.
 *
 * It cannot be fixed globally. Vuetify component `defaults` only apply to DECLARED props, and
 * `aria-label` is not a prop of `v-progress-linear`, so a default never reaches the element. The
 * `loader` slot is the supported way in: whatever it renders replaces the internal bar.
 *
 * ── Why a component rather than the markup inline ────────────────────────────────────────────
 * Every table in the app needs the identical slot, and the part that matters is the one easiest
 * to drop while copying: the label. Keeping it here means a new table is accessible by using the
 * component, and the accessibility suite has one place to fail rather than one per table.
 */
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
