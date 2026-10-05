/**
 * @module
 * Thin wrapper around the browser's `EventSource`: opens one connection, registers a listener
 * per typed event name, JSON-parses each frame, and drops frames that fail to parse — or, with
 * contract validation on, frames that do not match the AsyncAPI payload their event declares (in
 * production a mismatch is only logged, as for REST: additive drift must not mute a stream).
 * The SSE twin of `orvalMutator`'s response validation, behind the same `VITE_VALIDATE_RESPONSES`.
 *
 * The browser reconnects by itself after a dropped connection, but not after a refused one (a
 * 401, 429 or 503 on reconnect closes the source for good). When that happens the client opens a
 * new source after a growing delay, so the stream comes back without a reload.
 */

import * as zod from 'zod';
import { SSE_EVENT_PAYLOAD_SCHEMAS, type SseEventName, type SseEventPayload } from '@types';
import { isReportOnly, shouldValidateResponses } from '@/infrastructure/http/validate.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * Callbacks registered on an SSE connection.
 *
 * `TEventName` is the slice of the contract this connection subscribes to; it narrows what
 * `onEvent` can be called with.
 */
export interface SseClientCallbacks<TEventName extends SseEventName = SseEventName> {
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
    onEvent?: <TName extends TEventName>(eventName: TName, payload: SseEventPayload<TName>) => void;
}

/**
 * Handle returned by {@link createSseClient} to allow callers to close the connection.
 */
export interface SseClient {
    close: () => void;
}

/**
 * `EventSource.readyState` once the browser has given up on a connection, for good.
 * https://developer.mozilla.org/en-US/docs/Web/API/EventSource/readyState
 */
const SOURCE_CLOSED = 2;

/**
 * The waits before reopening a closed source, in milliseconds: it doubles from the first and stays
 * at the last.
 */
const REOPEN_DELAYS_MS: readonly number[] = [1000, 2000, 4000, 8000, 16_000, 30_000];

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
 * matches its event's contract. A mismatch is logged loudly. In dev, unit and e2e the frame is
 * dropped — an event listener has no caller to reject to, and a malformed payload must not reach
 * the UI. In production ({@link isReportOnly}) it is forwarded: one added optional field on the
 * backend must not silence a stream for every deployed frontend, exactly as for REST.
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
    return isReportOnly();
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
export const createSseClient = <TEventName extends SseEventName>(
    url: string,
    eventNames: readonly TEventName[],
    callbacks: SseClientCallbacks<TEventName> = {}
): SseClient => {
    /**
     * The source in use now; replaced when the browser closes one for good.
     */
    let eventSource: EventSource | undefined;

    /**
     * The pending reopen, if any.
     */
    let reopenTimer: ReturnType<typeof setTimeout> | undefined;

    /**
     * How many reopens in a row have not yet reached an open connection.
     */
    let failures = 0;

    /**
     * Whether the caller closed the client: nothing is reopened after that.
     */
    let closed = false;

    /**
     * Opens a source and wires every listener to the callbacks.
     */
    const open = () => {
        // Browser `EventSource`: `withCredentials` sends the session cookie on the (possibly
        // cross-origin) stream request, which the backend's SSE routes authenticate by.
        // https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource
        const source = new EventSource(url, { withCredentials: true });
        eventSource = source;

        source.addEventListener('open', () => {
            failures = 0;
            callbacks.onOpen?.();
        });
        source.addEventListener('error', (event) => {
            callbacks.onError?.(event);
            // A source that is still CONNECTING is retried by the browser; a CLOSED one never is.
            if (source.readyState === SOURCE_CLOSED && !closed) scheduleReopen();
        });

        // Register a listener per event name so the browser dispatches them individually
        for (const eventName of eventNames) {
            source.addEventListener(eventName, (event) => {
                const payload = parseJsonData((event as MessageEvent<string>).data);
                // `undefined` is `parseJsonData`'s failure signal; `null`, `0`, `false` and `""` are
                // legitimate payloads.
                if (payload === undefined || !passesContract(eventName, payload)) return;

                // Parsed from the wire; validated against this type's schema when the gate is on.
                callbacks.onEvent?.(eventName, payload as SseEventPayload<typeof eventName>);
            });
        }
    };

    /**
     * Opens a new source after the next wait.
     * https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
     */
    const scheduleReopen = () => {
        const delay = REOPEN_DELAYS_MS[Math.min(failures, REOPEN_DELAYS_MS.length - 1)];
        failures += 1;
        reopenTimer = setTimeout(open, delay);
    };

    open();

    return {
        /**
         * Closes the underlying EventSource, stops all SSE traffic and any pending reopen.
         */
        close: () => {
            closed = true;
            clearTimeout(reopenTimer);
            eventSource?.close();
        }
    };
};
