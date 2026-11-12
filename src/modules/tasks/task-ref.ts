/**
 * @module
 * The short reference of a task: the last eight characters of its id, the same `[#ref]` the
 * support mailbox's mails carry in their subject, so staff can match a mailbox thread to its task.
 */

import { shortRef } from '@/infrastructure/utils/formatters.ts';

/**
 * The `#ref` text of a task, as the backend writes it in a mail subject.
 *
 * @param id - The task's id.
 * @returns The id's last eight characters.
 */
export const taskRef = (id: string): string => shortRef(id);
