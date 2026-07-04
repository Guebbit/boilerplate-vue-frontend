<template>
    <div class="message-feed w-100 overflow-y-auto" :style="maxHeight ? { maxHeight } : undefined">
        <template v-if="messages.length > 0">
            <VAlert
                v-for="(message, index) in messages"
                :key="index"
                class="message-feed-item mb-3"
                :type="alertType"
                variant="tonal"
                density="comfortable"
            >
                <slot :message="message">{{ message }}</slot>
            </VAlert>
        </template>
        <p v-else-if="emptyText" class="message-feed-empty text-medium-emphasis text-center pa-4">
            {{ emptyText }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VAlert } from 'vuetify/components';

/*
 * Message feed: renders a list of messages as Vuetify alerts.
 */
const props = defineProps<{
    messages: string[];
    variant?: 'feed' | 'alert' | 'error' | 'success';
    maxHeight?: string;
    emptyText?: string;
}>();

/*
 * Maps the feed variant to a VAlert type.
 */
const alertType = computed(() => {
    switch (props.variant) {
        case 'error': {
            return 'error';
        }
        case 'success': {
            return 'success';
        }
        case 'alert': {
            return 'warning';
        }
        default: {
            return 'info';
        }
    }
});
</script>
