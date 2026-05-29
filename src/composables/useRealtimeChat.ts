import { storeToRefs } from 'pinia';
import { useRealtimeChatStore } from '@/stores/realtimeChat';
import { createChatClient } from '@/realtime/chat/createChatClient';

let activeClient: ReturnType<typeof createChatClient> | undefined;

const getWebsocketUrl = () => {
    const configuredUrl = import.meta.env.VITE_API_WEBSOCKET ?? 'ws://localhost:3000/ws/chat';

    return configuredUrl.replace(/^http:\/\//u, 'ws://').replace(/^https:\/\//u, 'wss://');
};

const buildTimestamp = () => new Date().toISOString();

export const useRealtimeChat = () => {
    const store = useRealtimeChatStore();

    const connect = () => {
        activeClient?.close();
        store.setStatus('connecting');

        activeClient = createChatClient(getWebsocketUrl(), {
            onOpen: () => store.setStatus('open'),
            onClose: () => store.setStatus('closed'),
            onError: () => {
                store.setStatus('error');
                store.setError('WebSocket connection error');
            },
            onEvent: (eventName, payload) => {
                if (eventName === 'realtime.chat.event.message.new') {
                    store.addEntry({
                        id: payload.payload.id,
                        kind: 'message',
                        username: payload.payload.username,
                        text: payload.payload.message,
                        timestamp: payload.payload.timestamp
                    });
                    return;
                }

                if (eventName === 'realtime.chat.event.presence.updated') {
                    store.setPresence(payload);
                    return;
                }

                if (eventName === 'realtime.chat.event.joined') {
                    store.setJoined(payload);
                    store.addEntry({
                        id: `joined-${buildTimestamp()}`,
                        kind: 'system',
                        text: `${payload.payload.username} joined ${payload.payload.room}`,
                        timestamp: buildTimestamp(),
                        username: payload.payload.username
                    });
                    return;
                }

                if (eventName === 'realtime.chat.event.error') {
                    store.addEntry({
                        id: `error-${buildTimestamp()}`,
                        kind: 'error',
                        text: payload.payload.message,
                        timestamp: buildTimestamp()
                    });
                    store.setError(payload.payload.message);
                    return;
                }

                store.addEntry({
                    id: `system-${buildTimestamp()}`,
                    kind: 'system',
                    text: payload.payload.message,
                    timestamp: payload.payload.timestamp
                });
            }
        });
    };

    const join = (username: string) => {
        const safeUsername = username.trim();
        if (!safeUsername || !activeClient) return;

        store.setUsername(safeUsername);
        activeClient.sendJoin(safeUsername);
    };

    const sendMessage = (message: string) => {
        const safeMessage = message.trim();
        if (!safeMessage || !activeClient || store.status !== 'open') return;

        activeClient.sendMessage(safeMessage);
    };

    const disconnect = () => {
        activeClient?.close();
        activeClient = undefined;
        store.setStatus('closed');
    };

    return {
        ...storeToRefs(store),
        connect,
        join,
        sendMessage,
        disconnect
    };
};
