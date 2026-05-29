<template>
    <LayoutDefault id="realtime-playground-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>Realtime playground</span>
            </h1>
        </template>

        <section class="realtime-grid">
            <article class="theme-card card-outlined realtime-card">
                <div class="card-header">
                    <h3>SSE observability</h3>
                    <p>Status: {{ observabilityStatus }}</p>
                </div>
                <div class="card-content">
                    <p>Latest heartbeat: {{ latestHeartbeatAt ?? 'n/a' }}</p>
                    <p>
                        Latest websocket connections:
                        {{ latestSnapshot?.realtime.websocketConnections ?? 'n/a' }}
                    </p>
                    <p>Latest SSE clients: {{ latestSnapshot?.realtime.sseClients ?? 'n/a' }}</p>
                    <BaseButton @click="connectObservability">Connect SSE</BaseButton>
                    <BaseButton @click="disconnectObservability">Disconnect SSE</BaseButton>
                </div>
            </article>

            <article class="theme-card card-outlined realtime-card">
                <div class="card-header">
                    <h3>WebSocket chat</h3>
                    <p>Status: {{ chatStatus }}</p>
                </div>
                <div class="card-content realtime-chat-card-content">
                    <BaseInput v-model="chatUsername" type="text" placeholder="username" />
                    <div class="realtime-chat-actions">
                        <BaseButton @click="connectChat">Connect WS</BaseButton>
                        <BaseButton @click="joinChat">Join chat</BaseButton>
                    </div>
                    <BaseInput v-model="chatMessage" type="text" placeholder="message" />
                    <BaseButton @click="sendChatMessage">Send message</BaseButton>
                    <p>Active users: {{ presence?.payload.users.join(', ') || 'n/a' }}</p>
                </div>
                <FeedbackMessageFeed
                    :messages="entries.map((entry) => `[${entry.kind}] ${entry.text}`)"
                    max-height="220px"
                    empty-text="No chat events yet"
                />
            </article>
        </section>
    </LayoutDefault>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import FeedbackMessageFeed from '@/components/organisms/FeedbackMessageFeed.vue';
import { useRealtimeObservability } from '@/composables/useRealtimeObservability';
import { useRealtimeChat } from '@/composables/useRealtimeChat';

const chatUsername = ref('');
const chatMessage = ref('');

const {
    status: observabilityStatus,
    latestSnapshot,
    latestHeartbeatAt,
    connect: connectObservability,
    disconnect: disconnectObservability
} = useRealtimeObservability();

const {
    status: chatStatus,
    entries,
    presence,
    connect: connectChat,
    join,
    sendMessage
} = useRealtimeChat();

const joinChat = () => {
    join(chatUsername.value);
};

const sendChatMessage = () => {
    sendMessage(chatMessage.value);
    chatMessage.value = '';
};
</script>

<style lang="scss">
#realtime-playground-page {
    .realtime-grid {
        display: grid;
        gap: 24px;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }

    .realtime-card {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .realtime-chat-card-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .realtime-chat-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
}
</style>
