/**
 * @module
 * View-only shapes for the bell: what the panel renders, assembled from the toolkit's message
 * store. No endpoint answers with these directly.
 */
import type { EToastType } from '@guebbit/vue-toolkit';

/**
 * One row of the bell's panel.
 */
export interface InboxItem {
    /**
     * The notification's server id, also the toolkit message id.
     */
    id: string;
    /**
     * The finished sentence, already in the reader's language.
     */
    text: string;
    /**
     * The toolkit variant the panel colours the row by (`info` already mapped to `primary`).
     */
    type: EToastType;
    /**
     * When the server wrote it, as the ISO string it sent.
     */
    createdAt: string;
    /**
     * The order the notification is about, when it is about one: the bell links to it.
     */
    orderId?: string | undefined;
    /**
     * Whether the owner has not opened the bell since it arrived.
     */
    unread: boolean;
}
