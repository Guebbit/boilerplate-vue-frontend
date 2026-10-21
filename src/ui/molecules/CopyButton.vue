<script setup lang="ts">
/**
 * @module
 * An icon button that copies one text to the clipboard and toasts the outcome, success or
 * failure. The icon is part of the button, so no caller can ship a glyph-less one. The size follows
 * the pointer (`useTouchFriendlySize`); `data-test` falls through to the button, the only root.
 */
import { Copy } from 'lucide-vue-next';
import { useCopyToClipboard } from '@/ui/composables/use-copy-to-clipboard.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';

/**
 * What to copy, how the button is named, and the toast for a failed copy.
 */
const { text, failureKey } = defineProps<{
    /**
     * The text written to the clipboard.
     */
    text: string;
    /**
     * The button's accessible name; it should say what is copied.
     */
    ariaLabel: string;
    /**
     * Locale key of the toast shown when the copy fails, worded for what was copied.
     */
    failureKey: string;
}>();

/**
 * Copies a text and toasts the outcome.
 */
const copy = useCopyToClipboard(failureKey);

/**
 * Button size: large under a finger, small under a mouse.
 */
const size = useTouchFriendlySize();
</script>

<template>
    <v-btn icon variant="text" :size="size" :aria-label="ariaLabel" @click="copy(text)">
        <Copy :size="14" aria-hidden="true" />
    </v-btn>
</template>
