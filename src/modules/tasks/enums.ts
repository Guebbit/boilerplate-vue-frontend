/**
 * @module
 * Tasks — the runtime enum constants this module's templates branch on, re-exported one
 * at a time from the generated API (a `.vue` file may not import `@api` itself). Task vocabulary: the inbox's status, category, kind and source filters.
 * The barrel publishes them, so a sibling reads them from `@/modules/tasks`.
 */

export { TaskStatus, TaskCategory, TaskKind, TaskSource } from '@api';
