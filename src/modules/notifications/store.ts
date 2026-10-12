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
import { createRequestTickets } from '@/infrastructure/utils/request-ticket.ts';
import { formatDate } from '@/infrastructure/utils/formatters.ts';
import { describeNotification, notificationOrderId } from './domain';
import type { InboxItem } from './types';

/**
 * How long a freshly arrived notification stays in the toast stack, in milliseconds. After that
 * it only lives in the bell.
 */
const TOAST_MS = 8000;

/**
 * The toolkit's `timeout` value that means "never auto-hide": a persistent message that is also a
 * quiet one, shown in the bell and not in the toast stack.
 * https://github.com/Guebbit/vue-toolkit
 */
const NO_AUTO_HIDE = -1;

/**
 * What happened to the inbox while one `GET /notifications` was in flight. That read may have been
 * answered just before the change, so it must not undo it when it lands.
 */
interface ReadGuard {
    /**
     * Ids a stream frame wrote: not rows the server dropped.
     */
    pushed: Set<string>;
    /**
     * Ids deleted meanwhile (a frame, or the owner): not rows to bring back.
     */
    deleted: Set<string>;
    /**
     * Set when the whole inbox was emptied meanwhile.
     */
    deletedAll: boolean;
    /**
     * The latest time the owner read the inbox meanwhile; re-applied to rows the read returns.
     */
    readAt?: string;
}

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
     * Orders the reads, and is the barrier that kills every read still out when the person changes.
     */
    const readTickets = createRequestTickets();

    /**
     * The reads in flight, each remembering what happened to the inbox since it left.
     */
    const readsInFlight = new Set<ReadGuard>();

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
            unread: notification.readAt === undefined,
            orderId: notificationOrderId(notification)
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
            describeNotification(notification, preferredLocales(), translate, formatDate),
            TOAST_TYPE[notification.severity],
            announce ? TOAST_MS : NO_AUTO_HIDE,
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
     * Applies one read's answer to the toolkit store: new rows are added quietly, known ones updated
     * in place, and one the server no longer has is removed without telling it. What changed while
     * the read was out ({@link ReadGuard}) wins over what the answer says.
     *
     * @param rows - The server's inbox as the read answered it.
     * @param guard - What happened to the inbox since the read left.
     */
    const applyRead = (rows: readonly Notification[], guard: ReadGuard) => {
        const live = new Set(rows.map(({ id }) => id));
        for (const { message } of inbox.value)
            if (!live.has(message.id) && !guard.pushed.has(message.id))
                messages.removeMessage(message.id);
        for (const row of rows) {
            if (guard.deleted.has(row.id) || (guard.deletedAll && !guard.pushed.has(row.id)))
                continue;
            project(
                guard.readAt !== undefined && row.readAt === undefined
                    ? { ...row, readAt: guard.readAt }
                    : row,
                false
            );
        }
    };

    /**
     * Reads the whole inbox and makes the toolkit store match it.
     *
     * Runs at login, on a reload and whenever the live stream (re)opens, since the stream carries
     * only what is written while it is open. A failure is reported here, as a toast: nobody asked
     * for the read by name. An answer for a person who has since gone, or one a fresher read has
     * already overtaken, lands nowhere.
     *
     * @returns A promise that always resolves, once the store matches the server or the failure was reported.
     */
    const sync = (): Promise<void> => {
        const claim = readTickets.take();
        const guard: ReadGuard = { pushed: new Set(), deleted: new Set(), deletedAll: false };
        readsInFlight.add(guard);
        return listNotifications()
            .then(({ data }) => {
                if (claim()) applyRead(data.items, guard);
            })
            .catch(report)
            .finally(() => {
                readsInFlight.delete(guard);
            });
    };

    /**
     * Tells every read in flight what just happened to the inbox.
     *
     * @param change - Fills in the guard's fields.
     */
    const noteForReads = (change: (guard: ReadGuard) => void) => {
        for (const guard of readsInFlight) change(guard);
    };

    /**
     * A stream frame: a notification was written for this person. Shows as a toast, once.
     *
     * @param payload - The frame's data.
     */
    const receiveCreated = ({ notification }: NotificationCreatedPayload) => {
        noteForReads(({ pushed }) => pushed.add(notification.id));
        project(notification, true);
    };

    /**
     * Drops every notification message, silently, and kills every read still out.
     * For the end of a session, so the next person never sees them, nor a late answer meant for
     * the previous one.
     */
    const reset = () => {
        readTickets.reset();
        for (const { message } of inbox.value) messages.removeMessage(message.id);
    };

    /**
     * Removes some notifications from the toolkit store, silently, and tells reads in flight.
     *
     * @param ids - The ids to drop; every notification when omitted.
     */
    const drop = (ids?: readonly string[]) => {
        const doomed = ids ?? inbox.value.map(({ message }) => message.id);
        noteForReads((guard) => {
            if (ids === undefined) guard.deletedAll = true;
            for (const id of doomed) guard.deleted.add(id);
        });
        for (const id of doomed) messages.removeMessage(id);
    };

    /**
     * A stream frame: notifications were deleted, here or in another tab or by the per-user cap.
     *
     * @param payload - The frame's data: the ids, or `all` for the whole inbox.
     */
    const receiveDeleted = ({ all, ids }: NotificationsDeletedPayload) => {
        drop(all ? undefined : ids);
    };

    /**
     * Stamps unread notifications as read, in place.
     *
     * @param readAt - The ISO time they were read.
     * @param ids - Which ones; every unread one when omitted.
     */
    const stampRead = (readAt: string, ids?: ReadonlySet<string>) => {
        noteForReads((guard) => {
            guard.readAt = readAt;
        });
        for (const { message, notification } of inbox.value)
            if (notification.readAt === undefined && (ids === undefined || ids.has(message.id)))
                project({ ...notification, readAt }, false);
    };

    /**
     * A stream frame: the owner opened the bell somewhere, so the badge clears everywhere. The
     * server's own time is the one kept.
     *
     * @param payload - The frame's data.
     */
    const receiveRead = ({ readAt }: NotificationsReadPayload) => stampRead(readAt);

    /**
     * The bell was opened: tells the server and clears the badge of the notifications that were
     * unread when it was. Nothing is sent when nothing is unread. A failure leaves the badge as it
     * was and shows a toast. The read endpoint answers without a time, so the rows carry the
     * browser's clock until the stream's `read` frame brings the server's; nothing shows it.
     *
     * @returns A promise that always resolves.
     */
    const markAllRead = (): Promise<void> => {
        const unread = new Set(
            items.value.filter(({ unread: isUnread }) => isUnread).map(({ id }) => id)
        );
        return unread.size === 0
            ? Promise.resolve()
            : readAllNotifications()
                  .then(() => stampRead(new Date().toISOString(), unread))
                  .catch(report);
    };

    /**
     * The owner deletes one notification. It leaves the panel at once and comes back, with a
     * toast, when the server refuses.
     *
     * @param id - The notification to delete.
     * @returns A promise that always resolves.
     */
    const dismiss = (id: string): Promise<void> => {
        noteForReads(({ deleted }) => deleted.add(id));
        return messages.dismissMessage(id).catch(report);
    };

    /**
     * The owner deletes every notification, in one call. Those that were in the panel when it was
     * pressed leave once the server has agreed; one that arrived meanwhile stays. A failure leaves
     * them all in place and shows a toast.
     *
     * @returns A promise that always resolves.
     */
    const dismissAll = (): Promise<void> => {
        const ids = inbox.value.map(({ message }) => message.id);
        return dismissAllNotifications()
            .then(() => {
                drop(ids);
            })
            .catch(report);
    };

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
        reset,
        retranslate
    };
});
