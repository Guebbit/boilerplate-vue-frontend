/**
 * Typed factories for the contract entities several specs need whole.
 *
 * Typed against the generated contract types, so a field the contract adds or makes required is a
 * compile error in every spec at once — rather than a hand-typed `{ id, totalPrice }` that only
 * fails when something finally parses it. Each factory also parses what it builds through the
 * generated response schema (`contractBody`), so a value a spec overrides with one the contract
 * refuses fails at the factory, not in a mounted view. The result is the ORIGINAL object, never
 * the parse, so no `.default()` the test did not write appears.
 *
 * Fork of BE `<paired-backend>/tests/support/body-of.ts` (a body read through the contract's schema), not kept in
 * step.
 */
import { STATUS_CODES } from 'node:http';
import { GetTaskResponse, GetUserByIdResponse, UpdateAccountResponse } from '@api/schemas';
import { contractBody } from './orval-fixture-schema.ts';
import type { Account, ErrorItem, Problem, Task, TaskListItem, User, UserActions } from '@types';

/**
 * A valid account as `PATCH /account` answers it — the three required fields, plus whatever a case
 * sets.
 *
 * @param overrides - the fields a case actually cares about
 * @returns an `Account` that parses against the generated schema
 */
export const anAccount = (overrides: Partial<Account> = {}): Account =>
    contractBody<Account>(UpdateAccountResponse, {
        id: '1',
        email: 'ada@example.com',
        username: 'ada',
        ...overrides
    });

/** Every `UserActions` flag `false`: a row the caller may do nothing to. */
export const NO_USER_ACTIONS: UserActions = {
    update: false,
    assignRole: false,
    revokeRole: false,
    delete: false,
    hardDelete: false,
    restore: false,
    placePurchaseHold: false,
    liftPurchaseHold: false,
    activate: false,
    deactivate: false
};

/** Every `UserActions` flag `true`: a row the caller may do anything to. */
export const ALL_USER_ACTIONS: UserActions = {
    update: true,
    assignRole: true,
    revokeRole: true,
    delete: true,
    hardDelete: true,
    restore: true,
    placePurchaseHold: true,
    liftPurchaseHold: true,
    activate: true,
    deactivate: true
};

/**
 * `UserActions` with every flag `false` but the ones a case names.
 *
 * @param allowed - the flags that are `true`
 * @returns a complete `UserActions`
 */
export const userActionsOf = (allowed: Partial<UserActions>): UserActions => ({
    ...NO_USER_ACTIONS,
    ...allowed
});

/**
 * A valid user as `GET /users/{id}` answers it — the required fields (`actions` included, all
 * `false`), plus whatever a case sets.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `User` that parses against the generated schema
 */
export const aUser = (overrides: Partial<User> = {}): User =>
    contractBody<User>(GetUserByIdResponse, {
        id: '1',
        email: 'ada@example.com',
        username: 'ada',
        actions: NO_USER_ACTIONS,
        ...overrides
    });

/** One error item as a spec writes it; `field` is the key `onResponseReject` lifts for the forms. */
type ProblemItem = ErrorItem & { field?: string };

/** The RFC 9110 names Node's `STATUS_CODES` still has under their older spelling. */
const CURRENT_TITLES: Record<number, string> = {
    413: 'Content Too Large',
    422: 'Unprocessable Content'
};

/**
 * The problem details an answered failure rejects with (RFC 9457), as the HTTP layer hands them to
 * a catch. One builder for every spec, typed on the generated `Problem`, so a member the contract
 * adds or requires is a compile error here and not a drift nobody sees.
 *
 * `Problem` has no response schema in `contracts/rest.generated/schemas.zod.ts`, so this fixture is typed on the generated
 * type but not parsed through the contract.
 *
 * @param status - The HTTP status the server answered with.
 * @param errors - The `errors` items; the first one's message is the `detail` unless one is given.
 * @param detail - The summary sentence, when a spec needs one that differs from the first item's.
 * @returns The rejection value.
 */
export const aProblem = (
    status: number,
    errors: ProblemItem[],
    detail: string = errors[0]?.message ?? ''
): Problem => ({
    type: 'about:blank',
    title: CURRENT_TITLES[status] ?? STATUS_CODES[status] ?? 'Error',
    status,
    detail,
    errors
});

/**
 * A new, unassigned visitor task the way the API answers it; a case overrides what it needs.
 *
 * @param overrides - Fields to replace.
 * @returns A task that passes the response schema.
 */
export const aTask = (overrides: Partial<Task> = {}): Task =>
    contractBody<Task>(GetTaskResponse, {
        id: 't1',
        source: 'visitor',
        kind: 'contact',
        routeSet: 'TaskDisplay',
        notes: [],
        overdue: false,
        actions: {
            resolve: true,
            markSpam: true,
            reopen: false,
            assign: true,
            unassign: false,
            note: true,
            delete: true
        },
        email: 'curious@example.com',
        subject: 'A question',
        message: 'About the cats',
        status: 'new',
        createdAt: '2026-01-01T00:00:00.000Z',
        ...overrides
    });

/**
 * A row of the staff inbox as `POST /tasks/search` answers it: a preview of the message, no notes.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `TaskListItem`
 */
export const aTaskListItem = (overrides: Partial<TaskListItem> = {}): TaskListItem => ({
    id: 't1',
    source: 'visitor',
    kind: 'contact',
    overdue: false,
    actions: {
        resolve: true,
        markSpam: true,
        reopen: false,
        assign: true,
        unassign: false,
        note: true,
        delete: true
    },
    email: 'curious@example.com',
    subject: 'A question',
    messagePreview: 'About the cats',
    status: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
});
