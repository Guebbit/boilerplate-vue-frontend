/**
 * @module
 * Example — the runtime enum constants this module's templates branch on, re-exported one
 * at a time from the generated API (a `.vue` file may not import `@api` itself). Example lifecycle: the list's status filter, its sort and its URL state.
 * The barrel publishes them, so a sibling reads them from `@/modules/example`.
 */

export { ExampleSortItem, ExampleStatus } from '@api';
