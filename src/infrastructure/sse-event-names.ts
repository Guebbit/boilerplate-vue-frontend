/**
 * @module
 * Slices the contract's one flat SSE event list by stream. `REALTIME_SSE_EVENT_NAMES` is generated
 * from every `x-transport: sse` channel in `asyncapi.yaml`, whatever endpoint serves it; a
 * consumer subscribes to the namespace of the stream it opened.
 */
import { REALTIME_SSE_EVENT_NAMES, type SseEventName } from '@types';

/**
 * The contract's event names that belong to ONE stream, by their namespace prefix.
 *
 * Each endpoint only ever sends its own namespace's events, so a consumer subscribes to its slice
 * and gets that slice's narrowed type back: a handler sees the payloads its stream really carries.
 *
 * @param namespace - The first segment of the event names, e.g. `notifications`.
 * @returns The event names under that namespace, in the contract's order.
 */
export const sseEventNamesOf = <TNamespace extends string>(
    namespace: TNamespace
): readonly Extract<SseEventName, `${TNamespace}.${string}`>[] =>
    REALTIME_SSE_EVENT_NAMES.filter(
        (name): name is Extract<SseEventName, `${TNamespace}.${string}`> =>
            name.startsWith(`${namespace}.`)
    );
