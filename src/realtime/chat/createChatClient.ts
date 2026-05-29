import { createSocket } from '@/utils/sockets.ts';
import type {
    IChatCommand,
    IChatEventName,
    IChatEventPayload,
    IChatMessageSendCommand,
    IChatJoinCommand
} from '@types';

export interface IChatClientCallbacks {
    onOpen?: () => void;
    onClose?: (code: number, reason: string) => void;
    onError?: (error: Event) => void;
    onEvent?: <TEventName extends IChatEventName>(
        eventName: TEventName,
        payload: IChatEventPayload<TEventName>
    ) => void;
}

export interface IChatClient {
    sendJoin: (username: string) => void;
    sendMessage: (message: string) => void;
    close: () => void;
}

const fallbackChannelByType = (eventType: string): IChatEventName | void => {
    if (eventType === 'chat:system') return 'realtime.chat.event.user.joined';
    if (eventType === 'chat:message') return 'realtime.chat.event.message.new';
    if (eventType === 'chat:presence') return 'realtime.chat.event.presence.updated';
    if (eventType === 'chat:joined') return 'realtime.chat.event.joined';
    if (eventType === 'chat:error') return 'realtime.chat.event.error';
};

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

const createJoinCommand = (username: string): IChatJoinCommand => ({
    type: 'chat:join',
    payload: {
        username,
        room: 'general'
    }
});

const createMessageCommand = (message: string): IChatMessageSendCommand => ({
    type: 'chat:message:send',
    payload: {
        message
    }
});

const sendCommand = (ws: WebSocket, command: IChatCommand) => {
    ws.send(JSON.stringify(command));
};

export const createChatClient = (url: string, callbacks: IChatClientCallbacks = {}): IChatClient => {
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
        sendJoin: (username) => sendCommand(ws, createJoinCommand(username)),
        sendMessage: (message) => sendCommand(ws, createMessageCommand(message)),
        close: () => ws.close()
    };
};
