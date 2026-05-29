import { storeToRefs } from 'pinia';
import { useRealtimeChatStore } from '@/stores/realtimeChat';
import { createChatClient } from '@/utils/createChatClient';

/**
 * Module-level singleton: ensures only one WebSocket is open at a time
 * regardless of how many component instances use this composable.
 */
let activeClient: ReturnType<typeof createChatClient> | undefined;

/**
 * Resolves the WebSocket endpoint from env and normalises the scheme.
 * Falls back to the local dev server and converts http(s) → ws(s) if needed.
 */
const getWebsocketUrl = () => {
    const configuredUrl = import.meta.env.VITE_API_WEBSOCKET ?? 'ws://localhost:3000/ws/chat';

    return configuredUrl.replace(/^http:\/\//u, 'ws://').replace(/^https:\/\//u, 'wss://');
};

/** Produces an ISO timestamp string for synthetic entry IDs. */
const buildTimestamp = () => new Date().toISOString();

/**
 * Composable that manages the WebSocket chat connection.
 * Exposes reactive store refs alongside `connect`, `join`, `sendMessage`, and `disconnect`.
 *
 * Uses a module-level `activeClient` singleton so remounting the chat component
 * does not open duplicate sockets.
 */
export const useRealtimeChat = () => {
    const store = useRealtimeChatStore();

    /**
     * Opens (or replaces) the WebSocket connection.
     * Tears down any existing client first to prevent duplicate connections.
     */
    const connect = () => {
        activeClient?.close();
        store.setStatus('connecting');

        // Create the WS client and map each chat event type to its store action
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

                // Fallback: treat unrecognised events as system messages
                store.addEntry({
                    id: `system-${buildTimestamp()}`,
                    kind: 'system',
                    text: payload.payload.message,
                    timestamp: payload.payload.timestamp
                });
            }
        });
    };

    /**
     * Sends a join command to enter the chat room as `username`.
     * Trims whitespace and no-ops if the client is not yet connected.
     */
    const join = (username: string) => {
        const safeUsername = username.trim();
        if (!safeUsername || !activeClient) return;

        store.setUsername(safeUsername);
        activeClient.sendJoin(safeUsername);
    };

    /**
     * Sends a chat message.
     * Trims whitespace and no-ops when the connection is not fully open.
     */
    const sendMessage = (message: string) => {
        const safeMessage = message.trim();
        if (!safeMessage || !activeClient || store.status !== 'open') return;

        activeClient.sendMessage(safeMessage);
    };

    /**
     * Closes the active WebSocket connection and resets store status to `closed`.
     * Safe to call even when no connection is open.
     */
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
