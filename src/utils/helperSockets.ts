
/**
 *
 */
export interface IWebSocketClientCallbacks {
    onOpen?: (ws: WebSocket) => void,
    onMessage?: (ws: WebSocket, message: MessageEvent) => void,
    onError?: (ws: WebSocket, error: Event) => void,
    onClose?: (ws: WebSocket, code: number, reason: string) => void
}

/**
 * Create a WebSocket client
 *
 * @param url - The WebSocket server URL.
 * @param onOpen - Called when the connection is successfully established.
 * @param onMessage - Called when a message is received.
 * @param onError - Called when an error occurs.
 * @param onClose - Called when the connection is closed.
 * @returns {WebSocket} The WebSocket client instance.
 */
export const createSocket = (
    url: string,
    {
        onOpen,
        onMessage,
        onError,
        onClose,
    }: Partial<IWebSocketClientCallbacks> = {}
): WebSocket => {
    const ws = new WebSocket(url);

    /**
     * Fired when the connection is successfully established.
     */
    ws.addEventListener('open', () =>
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        onOpen && onOpen(ws)
    );

    /**
     * Fired when a message is received from the server.
     */
    ws.addEventListener('message', (message) =>
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        onMessage && onMessage(ws, message)
    );

    /**
     * Fired when an error occurs.
     */
    ws.addEventListener('error', (error) =>
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        onError && onError(ws, error)
    );

    /**
     * Fired when the connection is closed.
     */
    ws.addEventListener('close', (event) =>
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        onClose && onClose(ws, event.code, event.reason)
    );

    return ws;
};