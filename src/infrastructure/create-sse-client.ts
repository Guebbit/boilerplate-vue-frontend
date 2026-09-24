/**
 * @module
 * Thin wrapper around the browser's `EventSource`: opens one connection, registers a listener
 * per typed event name, JSON-parses each frame, and drops frames that fail to parse — or, with
 * contract validation on, frames that do not match the AsyncAPI payload their event declares.
 * The SSE twin of `orvalMutator`'s response validation, behind the same `VITE_VALIDATE_RESPONSES`.
 */

import * as zod from 'zod';
import { SSE_EVENT_PAYLOAD_SCHEMAS, type SseEventName, type SseEventPayload } from '@types';
import { shouldValidateResponses } from '@/infrastructure/http/validate.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * Callbacks registered on an SSE connection.
 */
export interface SseClientCallbacks {
    /**
     * Called when the connection is successfully established.
     */
    onOpen?: () => void;
    /**
     * Called when the browser fires an error event on the EventSource.
     */
    onError?: (error: Event) => void;
    /**
     * Called for each typed server-sent event.
     * The generic parameter `TEventName` narrows `payload` to the correct contract type.
     */
    onEvent?: <TEventName extends SseEventName>(
        eventName: TEventName,
        payload: SseEventPayload<TEventName>
    ) => void;
}

/**
 * Handle returned by {@link createSseClient} to allow callers to close the connection.
 */
export interface SseClient {
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
    // eslint-disable-next-line no-restricted-syntax -- JSON.parse has no non-throwing form; a malformed SSE frame is dropped, not a crash
    try {
        return JSON.parse(rawData) as unknown;
    } catch {
        return;
    }
};

/**
 * One Zod schema per event name, built on first use from the generated JSON Schema — so a build
 * with validation off never pays for the conversion.
 */
const payloadSchemas = new Map<SseEventName, zod.ZodType>();

/**
 * The payload schema for one event, from `asyncapi.yaml` via `npm run gen:asyncapi`.
 *
 * @param eventName - The SSE event the frame arrived as.
 * @returns The Zod schema its payload must satisfy.
 */
const payloadSchemaFor = (eventName: SseEventName): zod.ZodType => {
    const cached = payloadSchemas.get(eventName);
    if (cached) return cached;
    // Zod's own JSON Schema importer — the generated schemas carry no `$ref`, so each is whole.
    // https://zod.dev/json-schema
    const built = zod.fromJSONSchema(SSE_EVENT_PAYLOAD_SCHEMAS[eventName]);
    payloadSchemas.set(eventName, built);
    return built;
};

/**
 * Whether a parsed frame may be handed on: always with validation off; with it on, only when it
 * matches its event's contract. A mismatch is logged loudly and the frame dropped — an event
 * listener has no caller to reject to, and a malformed payload must not reach the UI.
 *
 * @param eventName - The SSE event the frame arrived as.
 * @param payload - The frame's parsed `data`.
 * @returns `true` when the frame may be forwarded.
 */
const passesContract = (eventName: SseEventName, payload: unknown): boolean => {
    if (!shouldValidateResponses()) return true;
    const result = payloadSchemaFor(eventName).safeParse(payload);
    if (result.success) return true;

    const issues = result.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
    logger.error(
        `[contract] SSE frame "${eventName}" does not match the AsyncAPI schema:\n${issues}`
    );
    return false;
};

/**
 * Opens a persistent SSE connection and registers one listener per event name,
 * JSON-parsing each frame before forwarding it.
 *
 * @param url - SSE endpoint; opened with credentials so the auth cookie travels
 *  with it.
 * @param eventNames - Typed event names to subscribe to; one listener is
 *  registered per name so the browser dispatches them individually.
 * @param callbacks - Open/error/event handlers. Frames that fail to parse, or fail the
 *  contract while validation is on, are dropped without invoking `onEvent`.
 * @returns An {@link SseClient} handle whose `close` method tears down the
 *  connection.
 */
export const createSseClient = (
    url: string,
    eventNames: readonly SseEventName[],
    callbacks: SseClientCallbacks = {}
): SseClient => {
    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.addEventListener('open', () => callbacks.onOpen?.());
    eventSource.addEventListener('error', (event) => callbacks.onError?.(event));

    // Register a listener per event name so the browser dispatches them individually
    for (const eventName of eventNames) {
        eventSource.addEventListener(eventName, (event) => {
            const payload = parseJsonData((event as MessageEvent<string>).data);
            // `undefined` is `parseJsonData`'s failure signal; `null`, `0`, `false` and `""` are
            // legitimate payloads.
            if (payload === undefined || !passesContract(eventName, payload)) return;

            // Parsed from the wire; validated against this type's schema when the gate is on.
            callbacks.onEvent?.(eventName, payload as SseEventPayload<typeof eventName>);
        });
    }

    return {
        /**
         * Closes the underlying EventSource and stops all SSE traffic.
         */
        close: () => eventSource.close()
    };
};
