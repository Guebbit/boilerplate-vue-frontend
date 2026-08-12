import type { ISseEventName, ISseEventPayload } from '@types';

/** Callbacks registered on an SSE connection. */
export interface ISseClientCallbacks {
    /** Called when the connection is successfully established. */
    onOpen?: () => void;
    /** Called when the browser fires an error event on the EventSource. */
    onError?: (error: Event) => void;
    /**
     * Called for each typed server-sent event.
     * The generic parameter `TEventName` narrows `payload` to the correct contract type.
     */
    onEvent?: <TEventName extends ISseEventName>(
        eventName: TEventName,
        payload: ISseEventPayload<TEventName>
    ) => void;
}

/** Handle returned by {@link createSseClient} to allow callers to close the connection. */
export interface ISseClient {
    close: () => void;
}

/**
 * Safely parses a raw JSON string.
 *
 * @param rawData - Raw `data` field of an SSE frame.
 * @returns The parsed value, or `undefined` when the string is not valid JSON so
 *  callers can skip bad frames.
 */
const parseJsonData = (rawData: string) => {
    try {
        return JSON.parse(rawData) as unknown;
    } catch {
        return;
    }
};

/**
 * Opens a persistent SSE connection and registers one listener per event name,
 * JSON-parsing each frame before forwarding it.
 *
 * @param url - SSE endpoint; opened with credentials so the auth cookie travels
 *  with it.
 * @param eventNames - Typed event names to subscribe to; one listener is
 *  registered per name so the browser dispatches them individually.
 * @param callbacks - Open/error/event handlers. Frames that fail to parse are
 *  dropped without invoking `onEvent`.
 * @returns An {@link ISseClient} handle whose `close` method tears down the
 *  connection.
 */
export const createSseClient = (
    url: string,
    eventNames: readonly ISseEventName[],
    callbacks: ISseClientCallbacks = {}
): ISseClient => {
    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.addEventListener('open', () => callbacks.onOpen?.());
    eventSource.addEventListener('error', (event) => callbacks.onError?.(event));

    // Register a listener per event name so the browser dispatches them individually
    for (const eventName of eventNames) {
        eventSource.addEventListener(eventName, (event) => {
            const payload = parseJsonData((event as MessageEvent<string>).data);
            if (!payload) return;

            callbacks.onEvent?.(eventName, payload as ISseEventPayload<typeof eventName>);
        });
    }

    return {
        /** Closes the underlying EventSource and stops all SSE traffic. */
        close: () => eventSource.close()
    };
};
