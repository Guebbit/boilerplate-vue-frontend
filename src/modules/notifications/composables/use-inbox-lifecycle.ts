/**
 * @module
 * Keeps the inbox in step with the signed-in person: while one who may read notifications is
 * present it fetches the inbox and holds the live stream open; when that person leaves or changes
 * it closes the stream and empties the inbox, so the next person never sees someone else's.
 * Also re-translates every notification when the language switches.
 *
 * The stream carries only what is written while it is open, so every (re)open is followed by a
 * fresh read. See `docs/modules/notifications.md`.
 */
import { computed, onScopeDispose, watch } from 'vue';
import type { ComputedRef } from 'vue';
import { createSseClient } from '@/infrastructure/create-sse-client';
import type { SseClient } from '@/infrastructure/create-sse-client';
import { instance } from '@/infrastructure/http/client';
import { i18n } from '@/i18n';
import { useSessionStore } from '@/infrastructure/session.ts';
import { NOTIFICATIONS_CHANNELS } from '@types';
import type { SseEventPayload } from '@types';
import { useInboxStore } from '../store';

/**
 * The events `GET /notifications/stream` sends: the generated per-stream constant.
 */
const NOTIFICATION_EVENT_NAMES = Object.values(NOTIFICATIONS_CHANNELS);

/**
 * One of those events' names.
 */
type NotificationEventName = (typeof NOTIFICATION_EVENT_NAMES)[number];

/**
 * Where the stream is opened. Derived from the REST base, which already honours a runtime
 * `API_URL` override; the observability stream's own `API_SSE` override points at a different
 * endpoint and does not apply here.
 *
 * @returns The absolute stream URL.
 */
const streamUrl = (): string => `${instance.defaults.baseURL}/notifications/stream`;

/**
 * Starts the inbox for the signed-in person and stops it when they go. Call it once, from a
 * component that lives as long as the app shell does.
 *
 * @returns Whether this session may read notifications, for the caller's own rendering.
 */
export const useInboxLifecycle = (): ComputedRef<boolean> => {
    /**
     * The session, to learn who is here and what they may read.
     */
    const session = useSessionStore();

    /**
     * The inbox store the stream's frames and the first read go to.
     */
    const inbox = useInboxStore();

    /**
     * Whether this session may read notifications. Staff and administrators are signed in too and
     * hold the key as any account does; a guest never does.
     */
    const mayRead = computed(() => session.isAuth && session.can('read', 'Notification'));

    /**
     * The open stream, or `undefined` when none is.
     */
    let stream: SseClient | undefined;

    /**
     * What each stream event does to the inbox.
     */
    const handlers: { [Name in NotificationEventName]: (payload: SseEventPayload<Name>) => void } =
        {
            'notifications.created': inbox.receiveCreated,
            'notifications.deleted': inbox.receiveDeleted,
            'notifications.read': inbox.receiveRead
        };

    /**
     * Reads the inbox. The store reports a failed read itself, as an ambient one.
     */
    const refresh = () => {
        void inbox.sync();
    };

    /**
     * Closes the stream, if one is open.
     */
    const closeStream = () => {
        stream?.close();
        stream = undefined;
    };

    /**
     * Opens the stream and reads the inbox. The read is repeated every time the stream (re)opens,
     * because a frame written while it was down is never replayed.
     */
    const start = () => {
        refresh();
        stream = createSseClient(streamUrl(), NOTIFICATION_EVENT_NAMES, {
            onOpen: refresh,
            onEvent: (name, payload) => {
                // `name` and `payload` arrive as a generic pair the compiler cannot correlate in a
                // lookup; `SseEventPayload<name>` is by construction the type `handlers[name]` takes.
                (handlers[name] as (data: typeof payload) => void)(payload);
            }
        });
    };

    // Vue `watch`: keyed on the person's id (or nothing), so a switch from one account straight to
    // another restarts the inbox, and a plain logout stops it. `immediate` handles a session that
    // already exists when this runs, e.g. a restored one.
    // https://vuejs.org/api/reactivity-core.html#watch
    watch(
        () => (mayRead.value ? session.viewer?.id : undefined),
        (viewerId) => {
            closeStream();
            inbox.reset();
            if (viewerId) start();
        },
        { immediate: true }
    );

    // The text of every notification follows the language on screen.
    watch(() => i18n.global.locale.value, inbox.retranslate);

    onScopeDispose(closeStream);

    return mayRead;
};
