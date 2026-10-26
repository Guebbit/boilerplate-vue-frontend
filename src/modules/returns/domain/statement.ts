/**
 * @module
 * The day and channel a buyer stated a request or a withdrawal, as staff type them. A
 * `datetime-local` field holds a local wall-clock string; the API wants an instant, and never one in
 * the future, so both directions live here and the three forms that ask share them.
 */

/**
 * The channels staff can record, in the order the select lists them.
 */
export const STATEMENT_CHANNELS = ['phone', 'email', 'letter', 'other'] as const;

/**
 * One of {@link STATEMENT_CHANNELS}.
 */
export type StatementChannel = (typeof STATEMENT_CHANNELS)[number];

/**
 * Pads a date part to two digits.
 *
 * @param value - The part.
 * @returns The part as two digits.
 */
const two = (value: number): string => String(value).padStart(2, '0');

/**
 * A date as a `datetime-local` field holds it: local time, to the minute.
 *
 * @param at - The moment.
 * @returns `YYYY-MM-DDTHH:mm`.
 */
export const toLocalInput = (at: Date): string =>
    `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}T${two(at.getHours())}:${two(at.getMinutes())}`;

/**
 * The instant a `datetime-local` value means, as the API wants it.
 *
 * @param local - What the field holds; empty means nothing was typed.
 * @returns An ISO string, or `undefined` for an empty or unreadable value.
 */
export const localToIso = (local: string): string | undefined => {
    if (local === '') return undefined;
    const at = new Date(local);
    return Number.isNaN(at.getTime()) ? undefined : at.toISOString();
};

/**
 * Whether a typed value is a readable moment that is not in the future.
 *
 * @param local - What the field holds.
 * @param now - The present moment.
 * @returns `true` when it can be sent.
 */
export const isStatedInTime = (local: string, now = new Date()): boolean => {
    const iso = localToIso(local);
    return iso !== undefined && new Date(iso).getTime() <= now.getTime();
};

/**
 * {@link STATEMENT_CHANNELS} as a set of plain strings, so a select's value can be looked up.
 */
const CHANNEL_NAMES: ReadonlySet<string> = new Set(STATEMENT_CHANNELS);

/**
 * Whether a select's string is one of the channels staff can record.
 *
 * @param value - What the select holds.
 * @returns `true` (and narrows) when it is a channel.
 */
export const isStatementChannel = (value: string): value is StatementChannel =>
    CHANNEL_NAMES.has(value);
