<template>
    <div class="message-feed" :class="variant" :style="maxHeight ? { maxHeight } : undefined">
        <template v-if="messages.length > 0">
            <div
                v-for="(message, index) in messages"
                :key="index"
                class="message-feed-item theme-card"
            >
                <slot :message="message">{{ message }}</slot>
            </div>
        </template>
        <p v-else-if="emptyText" class="message-feed-empty">{{ emptyText }}</p>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    messages: string[];
    variant?: 'feed' | 'alert' | 'error' | 'success';
    maxHeight?: string;
    emptyText?: string;
}>();
</script>

<style lang="scss">
.message-feed {
    overflow-y: auto;
    width: 100%;

    .message-feed-item {
        margin-bottom: 12px;
        padding: 0.75rem 1rem;

        &:last-child {
            margin-bottom: 0;
        }
    }

    &.alert .message-feed-item {
        border-left: 4px solid rgb(var(--primary-500));
    }

    &.error .message-feed-item {
        border-left: 4px solid rgb(var(--red-500, 239 68 68));
    }

    &.success .message-feed-item {
        border-left: 4px solid rgb(var(--green-500, 34 197 94));
    }

    .message-feed-empty {
        margin: 0;
        opacity: 0.6;
        text-align: center;
        padding: 1rem;
    }
}
</style>
