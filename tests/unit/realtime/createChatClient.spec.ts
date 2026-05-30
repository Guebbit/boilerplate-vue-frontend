import { beforeEach, describe, expect, it, vi } from 'vitest';

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

// Reset module cache and mocks between tests for isolation
beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
});

describe('createChatClient', () => {
    it('sends join and message commands with AsyncAPI payload shapes', async () => {
        const { createChatClient } = await import('@/utils/createChatClient');
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
        const { createChatClient } = await import('@/utils/createChatClient');

        createChatClient('ws://localhost:3000/ws/chat', { onEvent });

        socketMocks.getHandlers().onMessage?.(
            {} as WebSocket,
            {
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
            } as MessageEvent
        );

        socketMocks.getHandlers().onMessage?.(
            {} as WebSocket,
            {
                data: JSON.stringify({
                    type: 'chat:error',
                    payload: {
                        message: 'Boom'
                    }
                })
            } as MessageEvent
        );

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

    it('fires onOpen when the WebSocket connection opens', async () => {
        const onOpen = vi.fn();
        const { createChatClient } = await import('@/utils/createChatClient');

        createChatClient('ws://localhost:3000/ws/chat', { onOpen });

        socketMocks.getHandlers().onOpen?.();

        expect(onOpen).toHaveBeenCalledOnce();
    });

    it('fires onClose with code and reason when the socket closes', async () => {
        const onClose = vi.fn();
        const { createChatClient } = await import('@/utils/createChatClient');

        createChatClient('ws://localhost:3000/ws/chat', { onClose });

        socketMocks.getHandlers().onClose?.({} as WebSocket, 1000, 'Normal closure');

        expect(onClose).toHaveBeenCalledWith(1000, 'Normal closure');
    });

    it('fires onError with the raw event when the socket errors', async () => {
        const onError = vi.fn();
        const { createChatClient } = await import('@/utils/createChatClient');

        createChatClient('ws://localhost:3000/ws/chat', { onError });

        const errorEvent = new Event('error');
        socketMocks.getHandlers().onError?.({} as WebSocket, errorEvent);

        expect(onError).toHaveBeenCalledWith(errorEvent);
    });

    it('closes the underlying WebSocket via the returned handle', async () => {
        const { createChatClient } = await import('@/utils/createChatClient');
        const client = createChatClient('ws://localhost:3000/ws/chat');

        client.close();

        expect(socketMocks.close).toHaveBeenCalledOnce();
    });

    it('silently ignores frames with invalid JSON', async () => {
        const onEvent = vi.fn();
        const { createChatClient } = await import('@/utils/createChatClient');

        createChatClient('ws://localhost:3000/ws/chat', { onEvent });

        socketMocks.getHandlers().onMessage?.(
            {} as WebSocket,
            {
                data: 'NOT VALID JSON'
            } as MessageEvent
        );

        expect(onEvent).not.toHaveBeenCalled();
    });

    it('silently ignores frames without a recognisable channel or type', async () => {
        const onEvent = vi.fn();
        const { createChatClient } = await import('@/utils/createChatClient');

        createChatClient('ws://localhost:3000/ws/chat', { onEvent });

        socketMocks.getHandlers().onMessage?.(
            {} as WebSocket,
            {
                data: JSON.stringify({ unknown: 'field' })
            } as MessageEvent
        );

        expect(onEvent).not.toHaveBeenCalled();
    });

    it('infers channel from legacy type field for all fallback mappings', async () => {
        const onEvent = vi.fn();
        const { createChatClient } = await import('@/utils/createChatClient');

        createChatClient('ws://localhost:3000/ws/chat', { onEvent });

        const legacyFrames = [
            {
                raw: { type: 'chat:message', payload: { id: '1', message: 'hi' } },
                expectedChannel: 'realtime.chat.event.message.new'
            },
            {
                raw: { type: 'chat:presence', payload: { room: 'general', users: ['alice'] } },
                expectedChannel: 'realtime.chat.event.presence.updated'
            },
            {
                raw: {
                    type: 'chat:system',
                    payload: { message: 'user joined', room: 'general', timestamp: 't' }
                },
                expectedChannel: 'realtime.chat.event.user.joined'
            },
            {
                raw: { type: 'chat:joined', payload: { username: 'alice', room: 'general' } },
                expectedChannel: 'realtime.chat.event.joined'
            }
        ];

        for (const { raw, expectedChannel } of legacyFrames) {
            socketMocks.getHandlers().onMessage?.(
                {} as WebSocket,
                {
                    data: JSON.stringify(raw)
                } as MessageEvent
            );

            expect(onEvent).toHaveBeenLastCalledWith(expectedChannel, raw);
        }

        expect(onEvent).toHaveBeenCalledTimes(legacyFrames.length);
    });
});
