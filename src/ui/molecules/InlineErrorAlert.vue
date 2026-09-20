<script setup lang="ts">
/**
 * @module
 * The one place a blocked workflow's error becomes markup. `role="alert"` so assistive tech
 * announces it the moment it appears — the whole reason it renders here instead of joining the
 * toast queue, which a screen reader has already moved past by the time someone looks back at
 * the form. Pairs with `useBlockingError`; see docs/theory/request-flow.md for which failures
 * belong here versus in a toast.
 */
withDefaults(
    defineProps<{
        /**
         * The message to show. The alert renders nothing while this is `undefined` — callers
         * bind it straight to `useBlockingError().message` rather than adding their own `v-if`.
         */
        message?: string;
        /**
         * `'warning'` for an expected absence (a lookup that matched nothing); `'error'` for an
         * actual failure. Bind straight to `useBlockingError().type`.
         */
        type?: 'error' | 'warning';
        /**
         * `data-test` on the rendered alert, for the spec that asserts it appeared.
         */
        testId?: string;
    }>(),
    { type: 'error' }
);
</script>

<template>
    <v-alert
        v-if="message"
        :type="type"
        density="compact"
        role="alert"
        :text="message"
        :data-test="testId"
    />
</template>
