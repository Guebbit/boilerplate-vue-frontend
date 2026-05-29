import { describe, expect, it, vi } from 'vitest';

const socketMocks = vi.hoisted(() => {
    let capturedHandlers: {
        onOpen?: () => void;
        onMessage?: (_: WebSocket, event: MessageEvent) => void;
        onError?: (_: WebSocket, event: Event) => void;
        onClose?: (_: WebSocket, code: number, reason: string) => void;
    } = {};

    const send = vi.fn();
    const close = vi.fn();

    return {
        getHandlers: () => capturedHandlers,
        send,
        close,
        createSocket: vi.fn((_url: string, handlers: typeof capturedHandlers) => {
            capturedHandlers = handlers;
            return {
                send,
                close
            } as unknown as WebSocket;
        })
    };
});

vi.mock('@/utils/sockets.ts', () => ({
    createSocket: socketMocks.createSocket
}));

describe('createChatClient', () => {
    it('sends join and message commands with AsyncAPI payload shapes', async () => {
        const { createChatClient } = await import('@/realtime/chat/createChatClient');
        const client = createChatClient('ws://localhost:3000/ws/chat');

        client.sendJoin('alice');
        client.sendMessage('hello');

        expect(socketMocks.send).toHaveBeenCalledWith(
            JSON.stringify({
                type: 'chat:join',
                payload: {
                    username: 'alice',
                    room: 'general'
                }
            })
        );
        expect(socketMocks.send).toHaveBeenCalledWith(
            JSON.stringify({
                type: 'chat:message:send',
                payload: {
                    message: 'hello'
                }
            })
        );
    });

    it('dispatches parsed incoming chat events to typed callbacks', async () => {
        const onEvent = vi.fn();
        const { createChatClient } = await import('@/realtime/chat/createChatClient');

        createChatClient('ws://localhost:3000/ws/chat', { onEvent });

        socketMocks.getHandlers().onMessage?.({} as WebSocket, {
            data: JSON.stringify({
                channel: 'realtime.chat.event.joined',
                payload: {
                    type: 'chat:joined',
                    payload: {
                        username: 'alice',
                        room: 'general'
                    }
                }
            })
        } as MessageEvent);

        socketMocks.getHandlers().onMessage?.({} as WebSocket, {
            data: JSON.stringify({
                type: 'chat:error',
                payload: {
                    message: 'Boom'
                }
            })
        } as MessageEvent);

        expect(onEvent).toHaveBeenCalledWith('realtime.chat.event.joined', {
            type: 'chat:joined',
            payload: {
                username: 'alice',
                room: 'general'
            }
        });

        expect(onEvent).toHaveBeenCalledWith('realtime.chat.event.error', {
            type: 'chat:error',
            payload: {
                message: 'Boom'
            }
        });
    });
});
