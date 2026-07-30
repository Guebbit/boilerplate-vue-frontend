<template>
    <div
        class="w-full overflow-y-auto"
        :style="maxHeight ? { maxHeight } : undefined"
        aria-live="polite"
    >
        <template v-if="messages.length > 0">
            <v-card
                v-for="(message, index) in messages"
                :key="index"
                variant="flat"
                border
                class="mb-3 border-s-4 px-4 py-3 last:mb-0"
                :class="variantBorderClass"
            >
                <slot :message="message">{{ message }}</slot>
            </v-card>
        </template>
        <p v-else-if="emptyText" class="m-0 p-4 text-center opacity-60">{{ emptyText }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    messages: string[];
    variant?: 'feed' | 'alert' | 'error' | 'success';
    maxHeight?: string;
    emptyText?: string;
}>();

/**
 * Left accent border keyed to the semantic variant.
 *
 * @returns The border utility class, or `undefined` for the plain `feed`
 *  variant, which carries no accent.
 */
const variantBorderClass = computed(
    () =>
        ({
            feed: undefined,
            alert: 'border-s-primary',
            error: 'border-s-error',
            success: 'border-s-success'
        })[props.variant ?? 'feed']
);
</script>
