import { createSocket } from '@/utils/sockets.ts';
import type {
    IChatCommand,
    IChatEventName,
    IChatEventPayload,
    IChatMessageSendCommand,
    IChatJoinCommand
} from '@types';

/** Callbacks registered on a chat WebSocket connection. */
export interface IChatClientCallbacks {
    /** Called when the WebSocket handshake completes. */
    onOpen?: () => void;
    /** Called when the socket closes; `code` and `reason` come from the CloseEvent. */
    onClose?: (code: number, reason: string) => void;
    /** Called on any socket-level error. */
    onError?: (error: Event) => void;
    /**
     * Called for each recognised incoming chat event.
     * The generic `TEventName` narrows `payload` to its contract type.
     */
    onEvent?: <TEventName extends IChatEventName>(
        eventName: TEventName,
        payload: IChatEventPayload<TEventName>
    ) => void;
}

/** Handle returned by {@link createChatClient}. Exposes send helpers and `close`. */
export interface IChatClient {
    sendJoin: (username: string) => void;
    sendMessage: (message: string) => void;
    close: () => void;
}

/**
 * Maps a legacy `type` field on unwrapped server messages to the canonical channel name.
 * Some backends emit `{ type, payload }` without an explicit channel; this bridges the gap.
 */
const fallbackChannelByType = (eventType: string): IChatEventName | void => {
    if (eventType === 'chat:system') return 'realtime.chat.event.user.joined';
    if (eventType === 'chat:message') return 'realtime.chat.event.message.new';
    if (eventType === 'chat:presence') return 'realtime.chat.event.presence.updated';
    if (eventType === 'chat:joined') return 'realtime.chat.event.joined';
    if (eventType === 'chat:error') return 'realtime.chat.event.error';
};

/**
 * Parses a raw WebSocket message frame.
 * Accepts two server envelope shapes:
 *   - `{ channel, payload }` — fully-typed AsyncAPI envelope.
 *   - `{ type, ...rest }` — legacy unwrapped format; channel is inferred via {@link fallbackChannelByType}.
 * Returns `undefined` for malformed or unrecognised frames so callers can skip them.
 */
const parseIncomingMessage = (rawData: unknown) => {
    if (typeof rawData !== 'string') return;

    try {
        const parsed = JSON.parse(rawData) as {
            channel?: IChatEventName;
            payload?: unknown;
            type?: string;
        };

        if (parsed.channel && parsed.payload)
            return { channel: parsed.channel, payload: parsed.payload };

        if (parsed.type) {
            const fallbackChannel = fallbackChannelByType(parsed.type);
            if (!fallbackChannel) return;

            return {
                channel: fallbackChannel,
                payload: parsed
            };
        }

        return;
    } catch {
        return;
    }
};

/** Builds the join command that authenticates and places the user in a room. */
const createJoinCommand = (username: string): IChatJoinCommand => ({
    type: 'chat:join',
    payload: {
        username,
        room: 'general'
    }
});

/** Builds the send-message command for the user's chat message text. */
const createMessageCommand = (message: string): IChatMessageSendCommand => ({
    type: 'chat:message:send',
    payload: {
        message
    }
});

/** Serialises and sends a typed command over the WebSocket. */
const sendCommand = (ws: WebSocket, command: IChatCommand) => {
    ws.send(JSON.stringify(command));
};

/**
 * Opens a WebSocket connection to `url` and wires the given `callbacks`.
 * Incoming frames are parsed and dispatched via `callbacks.onEvent` if recognised.
 *
 * @returns An {@link IChatClient} handle with typed send helpers and a `close` method.
 */
export const createChatClient = (
    url: string,
    callbacks: IChatClientCallbacks = {}
): IChatClient => {
    const ws = createSocket(url, {
        onOpen: () => callbacks.onOpen?.(),
        onClose: (_, code, reason) => callbacks.onClose?.(code, reason),
        onError: (_, error) => callbacks.onError?.(error),
        onMessage: (_, message) => {
            const incomingMessage = parseIncomingMessage(message.data);
            if (!incomingMessage) return;

            callbacks.onEvent?.(
                incomingMessage.channel,
                incomingMessage.payload as IChatEventPayload<typeof incomingMessage.channel>
            );
        }
    });

    return {
        /** Sends a join command placing `username` in the default room. */
        sendJoin: (username) => sendCommand(ws, createJoinCommand(username)),
        /** Sends a chat message command to the server. */
        sendMessage: (message) => sendCommand(ws, createMessageCommand(message)),
        /** Closes the underlying WebSocket. */
        close: () => ws.close()
    };
};
