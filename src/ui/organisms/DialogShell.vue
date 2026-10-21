<script setup lang="ts">
/**
 * @module
 * The `v-dialog` every form or step dialog sits in: fullscreen on a phone, named by its own
 * heading, and handing focus back to its opener on close. The caller renders the `v-card` and
 * everything inside it; the shell renders nothing of its own, so the DOM is the caller's.
 * Attributes it does not declare (`max-width`, `data-test`, `role`, `persistent`,
 * `aria-describedby`) fall through to the `v-dialog`.
 */
import { useId } from 'vue';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';

/**
 * Two-way `v-model`: whether the dialog is open.
 */
const isOpen = defineModel<boolean>({ required: true });

/**
 * The one slot: the dialog's content, given the id its heading must carry.
 */
defineSlots<{
    /**
     * The `v-card` and its content.
     *
     * @param props - `titleId`: put it on the heading, so the dialog is announced by its title.
     */
    default(props: { titleId: string }): unknown;
}>();

/**
 * The heading's id, so the dialog is announced by its title rather than as "dialog".
 */
const titleId = useId();

/**
 * Whether the dialog fills the screen — it does on a phone.
 */
const fullscreen = useFullscreenDialog();

/**
 * Hands focus back to the control that opened the dialog once it closes.
 */
useReturnFocus(() => isOpen.value);
</script>

<template>
    <v-dialog v-model="isOpen" :fullscreen="fullscreen" :aria-labelledby="titleId">
        <slot :title-id="titleId" />
    </v-dialog>
</template>
