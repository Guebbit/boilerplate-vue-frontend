/**
 * @module
 * Pinia store that fills the toolkit's message store from the server inbox. The toolkit's
 * `history` is the one place a notification lives here: each row is an `addMessage` call with
 * `persistent: true`, caller-owned `id` and the server row kept in `meta`, so a language switch
 * can re-translate it and a refetch updates it in place instead of duplicating it.
 *
 * Three verbs of the toolkit map onto the inbox:
 * - `dismissMessage`: the owner deletes one; its `onDismiss` is the `DELETE`, rolled back on failure.
 * - `removeMessage`: the app drops a row the server no longer has; silent, nothing echoes back.
 * - `hideMessage`: a toast closing; the notification stays in the bell.
 *
 * The data flow is drawn in `docs/modules/notifications.md`.
 */
import { computed } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import type { IToastMessage } from '@guebbit/vue-toolkit';
import {
    deleteNotificationById,
    dismissAllNotifications,
    listNotifications,
    readAllNotifications
} from '@api';
import type {
    Notification,
    NotificationCreatedPayload,
    NotificationSeverity,
    NotificationsDeletedPayload,
    NotificationsReadPayload
} from '@types';
import { i18n, translate } from '@/i18n';
import { notifyErrorMessages, rethrowUnlessAbsent } from '@/infrastructure/utils/errors.ts';
import { describeNotification } from './domain';
import type { InboxItem } from './types';

/**
 * How long a freshly arrived notification stays in the toast stack, in milliseconds. After that
 * it only lives in the bell.
 */
const TOAST_MS = 8000;

/**
 * Marks a toolkit message as one of this store's, so a persistent message some other feature adds
 * is never mistaken for a notification.
 */
const INBOX_SOURCE = 'inbox';

/**
 * What this store keeps in a toolkit message's free-form `meta`.
 */
interface InboxMeta extends Record<string, unknown> {
    /**
     * Always {@link INBOX_SOURCE}.
     */
    source: typeof INBOX_SOURCE;
    /**
     * The server row the message was built from: the text is re-derived from it on a language
     * switch, and `readAt` is where the unread state lives.
     */
    notification: Notification;
}

/**
 * The server's severity words mapped onto the toolkit's toast variants. `info` becomes `primary`:
 * the toolkit has no `info`, and the shell's toast stack renders `primary` as its neutral alert.
 */
const TOAST_TYPE: Record<NotificationSeverity, EToastType> = {
    info: EToastType.PRIMARY,
    success: EToastType.SUCCESS,
    warning: EToastType.WARNING,
    error: EToastType.DANGER
};

/**
 * The notification behind a toolkit message, or `undefined` when the message is not an inbox one.
 *
 * @param message - Any message in the toolkit's history.
 * @returns The server row kept in its `meta`.
 */
const notificationOf = (message: IToastMessage): Notification | undefined => {
    const { meta } = message;
    // `meta` is the toolkit's free-form `Record<string, unknown>`; the `source` stamp is what
    // proves this store wrote the shape it is read back as.
    return meta?.source === INBOX_SOURCE ? (meta.notification as Notification) : undefined;
};

/**
 * The languages to try for a product name inside a notification: the one the reader has on screen,
 * then the shop's main (fallback) one.
 *
 * @returns Locale codes, best first, without duplicates.
 */
const preferredLocales = (): string[] => {
    const { locale, fallbackLocale } = i18n.global;
    const main = typeof fallbackLocale.value === 'string' ? [fallbackLocale.value] : [];
    return [...new Set([locale.value, ...main])];
};

/**
 * Deletes one notification on the server. A 404 means it is already gone (another tab, the cap),
 * which is the state the caller asked for, so it is not a failure.
 *
 * @param id - The notification to delete.
 * @returns A promise settling once the server agrees it is gone.
 */
const deleteOnServer = (id: string): Promise<void> =>
    deleteNotificationById(id)
        .then(() => undefined)
        .catch((error: unknown) => rethrowUnlessAbsent(error, 404));

/**
 * The visitor's notifications, living in the toolkit's message store.
 *
 * Holds no list of its own: {@link items} is a view over the toolkit's persistent messages. What
 * it owns is the translation between a server row and a message, and every write the bell makes.
 */
export const useInboxStore = defineStore('inbox', () => {
    /**
     * The toolkit's one message store: toasts and persistent messages together.
     */
    const messages = useNotificationsStore();

    /**
     * Its persistent messages, newest first.
     */
    const { persistentMessages } = storeToRefs(messages);

    /**
     * Ids of notifications a stream frame wrote while a {@link sync} read was in flight; that read
     * may predate them, so it must not take them for rows the server dropped. `undefined` between
     * reads.
     */
    let pushedDuringSync: Set<string> | undefined;

    /**
     * Every notification message, newest first, with the row it was built from.
     */
    const inbox = computed(() =>
        persistentMessages.value.flatMap((message) => {
            const notification = notificationOf(message);
            return notification ? [{ message, notification }] : [];
        })
    );

    /**
     * What the panel renders, newest first.
     */
    const items = computed((): InboxItem[] =>
        inbox.value.map(({ message, notification }) => ({
            id: message.id,
            text: message.message,
            type: message.type,
            createdAt: notification.createdAt,
            unread: notification.readAt === undefined
        }))
    );

    /**
     * How many notifications the owner has not seen yet: the bell's badge.
     */
    const unreadCount = computed(() => items.value.filter(({ unread }) => unread).length);

    /**
     * Adds a notification to the toolkit store, or updates it in place when its id is known.
     *
     * An update keeps whether the toast is showing, so a refetch never brings back a toast the
     * reader already closed. A row seen for the first time during a refetch is hidden at once:
     * what was waiting for the reader is in the bell, not thrown at them as toasts.
     *
     * @param notification - The server row.
     * @param announce - Whether a first sighting also shows as a toast, for a fresh arrival.
     */
    const project = (notification: Notification, announce: boolean) => {
        const known = messages.findMessage(notification.id) !== undefined;
        const meta: InboxMeta = { source: INBOX_SOURCE, notification };
        messages.addMessage(
            describeNotification(notification, preferredLocales(), translate),
            TOAST_TYPE[notification.severity],
            announce ? TOAST_MS : -1,
            {
                id: notification.id,
                persistent: true,
                createdAt: Date.parse(notification.createdAt),
                meta,
                onDismiss: () => deleteOnServer(notification.id)
            }
        );
        if (!known && !announce) messages.hideMessage(notification.id);
    };

    /**
     * Shows an error from a write the bell made, as a toast, and reports it.
     *
     * @param error - The rejected value.
     */
    const report = (error: unknown) =>
        notifyErrorMessages((text) => messages.addMessage(text, EToastType.DANGER), error);

    /**
     * Reads the whole inbox and makes the toolkit store match it: new rows are added quietly, known
     * ones updated in place, and one the server no longer has is removed without telling it.
     *
     * Runs at login, on a reload and whenever the live stream (re)opens, since the stream carries
     * only what is written while it is open.
     *
     * @returns A promise settling once the store matches the server.
     */
    const sync = (): Promise<void> => {
        const pushed = new Set<string>();
        pushedDuringSync = pushed;
        return listNotifications()
            .then(({ data }) => {
                const live = new Set(data.items.map(({ id }) => id));
                for (const { message } of inbox.value)
                    if (!live.has(message.id) && !pushed.has(message.id))
                        messages.removeMessage(message.id);
                for (const notification of data.items) project(notification, false);
            })
            .finally(() => {
                if (pushedDuringSync === pushed) pushedDuringSync = undefined;
            });
    };

    /**
     * A stream frame: a notification was written for this person. Shows as a toast, once.
     *
     * @param payload - The frame's data.
     */
    const receiveCreated = ({ notification }: NotificationCreatedPayload) => {
        pushedDuringSync?.add(notification.id);
        project(notification, true);
    };

    /**
     * Drops every notification message, silently. For the end of a session, so the next person
     * never sees them.
     */
    const clear = () => {
        for (const { message } of inbox.value) messages.removeMessage(message.id);
    };

    /**
     * A stream frame: notifications were deleted, here or in another tab or by the per-user cap.
     *
     * @param payload - The frame's data: the ids, or `all` for the whole inbox.
     */
    const receiveDeleted = ({ all, ids }: NotificationsDeletedPayload) => {
        if (all) {
            clear();
            return;
        }
        for (const id of ids) messages.removeMessage(id);
    };

    /**
     * Stamps every unread notification as read, in place.
     *
     * @param readAt - The ISO time the server read them.
     */
    const applyRead = (readAt: string) => {
        for (const { notification } of inbox.value)
            if (notification.readAt === undefined) project({ ...notification, readAt }, false);
    };

    /**
     * A stream frame: the owner opened the bell somewhere, so the badge clears everywhere.
     *
     * @param payload - The frame's data.
     */
    const receiveRead = ({ readAt }: NotificationsReadPayload) => applyRead(readAt);

    /**
     * The bell was opened: tells the server and clears the badge. Nothing is sent when nothing is
     * unread. A failure leaves the badge as it was and shows a toast.
     *
     * @returns A promise that always resolves.
     */
    const markAllRead = (): Promise<void> =>
        unreadCount.value === 0
            ? Promise.resolve()
            : readAllNotifications()
                  .then(() => applyRead(new Date().toISOString()))
                  .catch(report);

    /**
     * The owner deletes one notification. It leaves the panel at once and comes back, with a
     * toast, when the server refuses.
     *
     * @param id - The notification to delete.
     * @returns A promise that always resolves.
     */
    const dismiss = (id: string): Promise<void> => messages.dismissMessage(id).catch(report);

    /**
     * The owner deletes every notification, in one call. They leave the panel once the server has
     * agreed; a failure leaves them all in place and shows a toast.
     *
     * @returns A promise that always resolves.
     */
    const dismissAll = (): Promise<void> => dismissAllNotifications().then(clear).catch(report);

    /**
     * Rebuilds every message's text, for a language switch. Updates in place, so no toast returns.
     */
    const retranslate = () => {
        for (const { notification } of inbox.value) project(notification, false);
    };

    return {
        items,
        unreadCount,
        sync,
        receiveCreated,
        receiveDeleted,
        receiveRead,
        markAllRead,
        dismiss,
        dismissAll,
        clear,
        retranslate
    };
});
