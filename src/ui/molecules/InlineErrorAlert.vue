<script setup lang="ts">
/**
 * @module
 * The one place a blocked workflow's error becomes markup. `role="alert"` so assistive tech
 * announces it the moment it appears — the whole reason it renders here instead of joining the
 * toast queue, which a screen reader has already moved past by the time someone looks back at
 * the form. Pairs with `useBlockingError`; see docs/theory/request-flow.md for which failures
 * belong here versus in a toast.
 *
 * No `testId` prop: `data-test` falls through to `<v-alert>` like any other attribute, since
 * this component has exactly one root element to land on. A caller writes
 * `<InlineErrorAlert data-test="…" />` directly, the same convention every other single-root
 * molecule in this kit uses.
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
    }>(),
    { type: 'error' }
);
</script>

<template>
    <v-alert v-if="message" :type="type" density="compact" role="alert" :text="message" />
</template>
