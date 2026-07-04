<template>
    <LayoutDefault id="realtime-playground-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>Realtime playground</span>
            </h1>
        </template>

        <VRow dense>
            <VCol cols="12" lg="6">
                <VCard class="h-100" rounded="lg" variant="outlined">
                    <VCardTitle class="d-flex align-center ga-2">
                        <VIcon icon="$info" />
                        SSE observability
                    </VCardTitle>
                    <VCardText class="d-flex flex-column ga-4">
                        <VChip color="primary" variant="tonal" class="align-self-start">
                            Status: {{ observabilityStatus }}
                        </VChip>
                        <div>
                            <p class="mb-2">Latest heartbeat: {{ latestHeartbeatAt ?? 'n/a' }}</p>
                            <p class="mb-2">
                                Latest websocket connections:
                                {{ latestSnapshot?.realtime.websocketConnections ?? 'n/a' }}
                            </p>
                            <p class="mb-0">
                                Latest SSE clients:
                                {{ latestSnapshot?.realtime.sseClients ?? 'n/a' }}
                            </p>
                        </div>
                        <div class="d-flex flex-wrap ga-3">
                            <BaseButton @click="connectObservability">Connect SSE</BaseButton>
                            <BaseButton @click="disconnectObservability">Disconnect SSE</BaseButton>
                        </div>
                    </VCardText>
                </VCard>
            </VCol>

            <VCol cols="12" lg="6">
                <VCard class="h-100" rounded="lg" variant="outlined">
                    <VCardTitle class="d-flex align-center ga-2">
                        <VIcon icon="$account" />
                        WebSocket chat
                    </VCardTitle>
                    <VCardText class="d-flex flex-column ga-4">
                        <VChip color="secondary" variant="tonal" class="align-self-start">
                            Status: {{ chatStatus }}
                        </VChip>
                        <BaseInput v-model="chatUsername" type="text" placeholder="username" />
                        <div class="d-flex flex-wrap ga-3">
                            <BaseButton @click="connectChat">Connect WS</BaseButton>
                            <BaseButton @click="joinChat">Join chat</BaseButton>
                        </div>
                        <BaseInput v-model="chatMessage" type="text" placeholder="message" />
                        <BaseButton @click="sendChatMessage">Send message</BaseButton>
                        <p class="mb-0">
                            Active users: {{ presence?.payload.users.join(', ') || 'n/a' }}
                        </p>
                        <VDivider />
                        <FeedbackMessageFeed
                            :messages="entries.map((entry) => `[${entry.kind}] ${entry.text}`)"
                            max-height="220px"
                            empty-text="No chat events yet"
                        />
                    </VCardText>
                </VCard>
            </VCol>
        </VRow>
    </LayoutDefault>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
    VCard,
    VCardText,
    VCardTitle,
    VChip,
    VCol,
    VDivider,
    VIcon,
    VRow
} from 'vuetify/components';
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

/*
 * Joins the chat with the typed display name.
 */
const joinChat = () => {
    join(chatUsername.value);
};

/*
 * Sends the typed message and clears the input.
 */
const sendChatMessage = () => {
    sendMessage(chatMessage.value);
    chatMessage.value = '';
};
</script>
