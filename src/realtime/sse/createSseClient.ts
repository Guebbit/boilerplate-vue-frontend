import type { ISseEventName, ISseEventPayload } from '@types';

export interface ISseClientCallbacks {
    onOpen?: () => void;
    onError?: (error: Event) => void;
    onEvent?: <TEventName extends ISseEventName>(
        eventName: TEventName,
        payload: ISseEventPayload<TEventName>
    ) => void;
}

export interface ISseClient {
    close: () => void;
}

const parseJsonData = (rawData: string) => {
    try {
        return JSON.parse(rawData) as unknown;
    } catch {
        return;
    }
};

export const createSseClient = (
    url: string,
    eventNames: readonly ISseEventName[],
    callbacks: ISseClientCallbacks = {}
): ISseClient => {
    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.addEventListener('open', () => callbacks.onOpen?.());
    eventSource.addEventListener('error', (event) => callbacks.onError?.(event));

    for (const eventName of eventNames) {
        eventSource.addEventListener(eventName, (event) => {
            const payload = parseJsonData((event as MessageEvent<string>).data);
            if (!payload) return;

            callbacks.onEvent?.(
                eventName,
                payload as ISseEventPayload<typeof eventName>
            );
        });
    }

    return {
        close: () => eventSource.close()
    };
};
