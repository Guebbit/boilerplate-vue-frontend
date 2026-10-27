/**
 * Small helpers for the specs that settle API answers by hand: held promises, typed answers and
 * the two shapes a failed call rejects with.
 */
import { aProblem } from './fixtures.ts';

/**
 * What a generated client function resolves with, so a held answer is typed by the call it answers.
 */
export type Answer<TCall extends (...parameters: never[]) => Promise<unknown>> = Awaited<
    ReturnType<TCall>
>;

/**
 * A success as the API answers: the payload itself. Named so a test reads as "the answer".
 *
 * @param data - The answer's payload
 * @returns The payload, unchanged
 */
export const answered = <TData>(data: TData) => data;

/**
 * One answer the test settles by hand: the promise a mocked call returns, and the two ways to end it.
 */
export interface Gate<T> {
    /** What the mocked call returns. */
    promise: Promise<T>;
    /** Answers the call. */
    resolve: (value: T) => void;
    /** Fails the call. */
    reject: (reason: unknown) => void;
}

/**
 * A call whose answer the test holds back, to deliver answers in an order the network might.
 *
 * @returns The pending promise and its settlers
 */
export const gate = <T>(): Gate<T> => Promise.withResolvers<T>();

/**
 * The problem details the app's HTTP layer throws for an answered failure, never an `Error`.
 *
 * @param status - The HTTP status the server answered with
 * @param code - The stable error code in `errors[0].code`
 * @returns The rejection value
 */
export const apiRejection = (status: number, code: string) =>
    aProblem(status, [{ code, message: code }]);

/**
 * What a request that never got an answer rejects with: no `status` at all.
 *
 * @returns The rejection value
 */
export const lostAnswer = () => new Error('Network Error');
