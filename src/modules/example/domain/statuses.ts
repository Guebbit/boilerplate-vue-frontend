/**
 * @module
 * Pure client-side rules over plain data: which statuses an example may move to. No store, no
 * component, no axios, which is also what lets a component read them (a component may not import
 * the generated client).
 */
import type { ExampleStatus } from '@types';

/**
 * The moves each status allows, as the API does: a draft goes out or away, a published example is
 * withdrawn by archiving it, an archived one comes back as a draft. The server is still the judge;
 * this only keeps a screen from offering what it would refuse. A `Record` over every status, so a
 * status the contract adds fails compilation here until it is given a row.
 */
export const NEXT_STATUSES: Readonly<Record<ExampleStatus, readonly ExampleStatus[]>> = {
    draft: ['published', 'archived'],
    published: ['archived'],
    archived: ['draft']
};

/**
 * Every status, in the order a screen lists them. Read off {@link NEXT_STATUSES} so there is one
 * list to keep, not two.
 */
// `Object.keys` types its result `string[]`; the keys of a `Record<ExampleStatus, …>` are
// exactly `ExampleStatus`, which is what the cast says.
export const EXAMPLE_STATUSES = Object.keys(NEXT_STATUSES) as ExampleStatus[];
