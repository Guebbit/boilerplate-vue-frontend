/**
 * @module
 * The words for a task kind. The kind is an open enum: a newer backend may send one this client
 * has no word for, and it then reads "Task" (`task-kind.unknown`), as the notification bell does.
 */
import { TaskKind } from './enums.ts';

/**
 * The translation key for a task kind, falling back to the generic one for a kind not known yet.
 * Production validation is report-only, so an unknown kind reaches the screens as it arrived:
 * see `isReportOnly` in `src/infrastructure/http/validate.ts`.
 *
 * @param kind - The kind the server sent.
 * @returns `task-kind.<kind>` for a known kind, else `task-kind.unknown`.
 */
export const taskKindKey = (kind: string): string =>
    (Object.values(TaskKind) as string[]).includes(kind)
        ? `task-kind.${kind}`
        : 'task-kind.unknown';
