/**
 * Property-based tests — `src/infrastructure/formatters.ts` and `src/infrastructure/uploads.ts`.
 *
 * The example-based suites next door assert what these functions do for the inputs someone
 * thought of. These assert what must hold for EVERY input, which is a different question and
 * catches a different class of bug: the boundary nobody enumerated, the surrogate pair, the
 * `-0`, the string that is whitespace in a script you have never seen.
 *
 * Why this layer exists at all: it is the general form of a fix this repo already paid for the
 * expensive way. `responseSchemaMap.ts` was tested by sampling a handful of rows from a 52-row
 * table and scored 55% mutation with 182 survivors in that one file; replacing the sample with
 * exhaustive generation took it to ~96% and the whole suite from 55% to 81%. Sampling a space
 * you could have covered is the failure mode, and generation is the answer to it.
 *
 * TWO RULES, both non-negotiable and both about determinism:
 *
 *   1. **Every run is seeded.** `fast-check` defaults to a random seed, which makes a failure
 *      un-reproducible and — worse — makes a test that fails one run in fifty look like flake.
 *      A fixed seed means this suite either passes or fails, the same way every other test does.
 *   2. **Every counterexample becomes a regression case**, written out as an ordinary `it()` with
 *      the seed that found it in a comment. The property stays as the general statement; the
 *      example stays as the thing that once broke.
 *
 * `numRuns` is deliberately modest. These run on the pre-commit path, where the frontend gate is
 * already ~8.5 minutes; a property that needs ten thousand cases to find its bug is a property
 * that wants a nightly, not a commit hook.
 *
 * ── SPLIT WITH `formatters.spec.ts` / `uploads.spec.ts` ─────────────────────────────────────
 * Those files are example-based and own the SPECIFIC values: the exact size boundary, the
 * non-canonical `image/jpg`, the shipped copy of a message. This file owns what only generation
 * can claim — that a rule holds for EVERY input, not for the ones someone thought of.
 *
 * Check there before adding a case here. A fact asserted twice is maintained twice.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
    EMPTY_VALUE,
    formatCurrency,
    formatFlag,
    formatText,
    formatDateTime,
    formatDate
} from '@/infrastructure/utils/formatters';
import {
    ACCEPTED_IMAGE_TYPES,
    MAX_UPLOAD_BYTES,
    formatUploadSize,
    isAcceptedImageType,
    isWithinUploadSizeLimit
} from '@/infrastructure/utils/uploads';

/**
 * One seed for the whole file, and one place to change it.
 *
 * `endOnFailure` trims the shrunk counterexample instead of continuing to shrink for a while
 * after it has one, which keeps a failure message short enough to paste into a regression case.
 */
const RUN = { seed: 20_260_808, numRuns: 200, endOnFailure: true } as const;

/**
 * The two nullish spellings these signatures actually accept.
 *
 * `formatText(value?: string | null)`, `formatCurrency(value?: number | null)` and
 * `formatFlag(value: boolean | null | undefined, …)` all admit both, and the properties below
 * depend on both taking the fallback branch — so neither can be dropped to satisfy a lint rule
 * that would rather this codebase had only `undefined`.
 */
const nullish = () => fc.constantFrom(null, undefined);

/** The locale the formatters read. Pinned so a machine's locale cannot decide the assertions. */
vi.mock('@/infrastructure/i18n', () => ({
    getCurrentLocale: () => 'en'
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('formatText', () => {
    it('never returns an empty or blank string, for any input', () =>
        fc.assert(
            fc.property(fc.option(fc.string(), { nil: undefined }), (value) => {
                const result = formatText(value);
                // The whole purpose of the function: a table cell always has something in it.
                expect(result.trim().length).toBeGreaterThan(0);
            }),
            RUN
        ));

    it('returns the fallback for exactly the inputs that carry no text', () =>
        fc.assert(
            fc.property(fc.option(fc.string(), { nil: undefined }), (value) => {
                // A biconditional, not two separate cases: this is the whole decision rule, and
                // asserting it both ways is what stops the boundary drifting in one direction.
                const isBlank = value === undefined || value.trim().length === 0;
                expect(formatText(value) === EMPTY_VALUE).toBe(isBlank || value === EMPTY_VALUE);
            }),
            RUN
        ));

    it('returns non-blank input UNCHANGED, rather than trimmed', () =>
        fc.assert(
            fc.property(fc.string({ minLength: 1 }), (value) => {
                fc.pre(value.trim().length > 0);
                // The emptiness test trims; the return value does not. A refactor that returned
                // `value.trim()` would pass every "is it non-empty" assertion above.
                expect(formatText(` ${value} `)).toBe(` ${value} `);
            }),
            RUN
        ));

    it('is idempotent', () =>
        fc.assert(
            fc.property(fc.option(fc.string(), { nil: undefined }), (value) => {
                expect(formatText(formatText(value))).toBe(formatText(value));
            }),
            RUN
        ));
});

describe('formatCurrency', () => {
    it('returns the fallback for every non-number, and never for a number', () =>
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.double({ noNaN: true, noDefaultInfinity: true }),
                    nullish(),
                    fc.string(),
                    fc.boolean()
                ),
                (value) => {
                    const result = formatCurrency(value as number | null | undefined);
                    expect(result === EMPTY_VALUE).toBe(typeof value !== 'number');
                }
            ),
            RUN
        ));

    it('never throws, for any amount and any currency code', () =>
        fc.assert(
            fc.property(
                fc.double({ noNaN: true, noDefaultInfinity: true }),
                fc.string(),
                (value, currency) => {
                    // The `catch` in formatCurrency exists for exactly this: an unknown or
                    // malformed ISO 4217 code makes Intl throw a RangeError, and a product page
                    // must not 500 over a currency string. Generation is what reaches the codes
                    // nobody would think to write down.
                    expect(() => formatCurrency(value, currency)).not.toThrow();
                }
            ),
            RUN
        ));

    it('degrades to a plain number rather than the fallback on a bad currency', () =>
        fc.assert(
            fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (value) => {
                // The failure path must still show the AMOUNT. Returning EMPTY_VALUE here would
                // hide a real price behind an em dash because of a config typo.
                expect(formatCurrency(value, 'not-a-currency')).not.toBe(EMPTY_VALUE);
            }),
            RUN
        ));

    it('renders every finite amount with at least one digit', () =>
        fc.assert(
            fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (value) => {
                expect(formatCurrency(value)).toMatch(/\d/);
            }),
            RUN
        ));
});

describe('formatFlag', () => {
    it('returns one of exactly three things, and the fallback only for nullish', () =>
        fc.assert(
            fc.property(
                fc.option(fc.boolean(), { nil: undefined }),
                fc.string(),
                fc.string(),
                (value, trueLabel, falseLabel) => {
                    // The expected value is computed first and asserted once, rather than
                    // branching around two `expect`s — same property, but it states the whole
                    // decision rule as one expression.
                    //
                    // `false` is the classic place this breaks: a `!value` guard would send it
                    // down the fallback branch alongside null and undefined.
                    const expected =
                        value === undefined ? EMPTY_VALUE : value ? trueLabel : falseLabel;

                    expect(formatFlag(value, trueLabel, falseLabel)).toBe(expected);
                }
            ),
            RUN
        ));
});

describe('formatDateTime', () => {
    it('never throws, whatever string it is handed', () =>
        fc.assert(
            fc.property(fc.option(fc.string(), { nil: undefined }), (value) => {
                // The value comes off the wire. An unparseable one yields "Invalid Date", which
                // is ugly but must not be an exception in a render.
                expect(() => formatDateTime(value)).not.toThrow();
            }),
            RUN
        ));

    it('returns the fallback for every falsy input', () =>
        fc.assert(
            fc.property(fc.oneof(nullish(), fc.constant('')), (value) => {
                expect(formatDateTime(value)).toBe(EMPTY_VALUE);
            }),
            RUN
        ));
});

describe('formatDate', () => {
    it('never throws, whatever string it is handed', () =>
        fc.assert(
            fc.property(fc.option(fc.string(), { nil: undefined }), (value) => {
                // Same contract as `formatDateTime`: off-the-wire input, never an exception mid-render.
                expect(() => formatDate(value)).not.toThrow();
            }),
            RUN
        ));

    it('returns the fallback for every falsy input', () =>
        fc.assert(
            fc.property(fc.oneof(nullish(), fc.constant('')), (value) => {
                expect(formatDate(value)).toBe(EMPTY_VALUE);
            }),
            RUN
        ));

    it('is never longer than the datetime it drops the time from', () =>
        fc.assert(
            fc.property(fc.date({ noInvalidDate: true }), (date) => {
                const iso = date.toISOString();
                expect(formatDate(iso).length).toBeLessThanOrEqual(formatDateTime(iso).length);
            }),
            RUN
        ));
});

/** A File whose `type` and `size` are the only fields the upload predicates read. */
const makeFile = (type: string, size: number) => ({ type, size }) as File;

describe('upload predicates', () => {
    it('accepts a type if and only if it is on the shared list', () =>
        fc.assert(
            fc.property(fc.string(), fc.nat(), (type, size) => {
                expect(isAcceptedImageType(makeFile(type, size))).toBe(
                    (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)
                );
            }),
            RUN
        ));

    it('is case-sensitive about the mime type, matching the backend', () =>
        fc.assert(
            fc.property(fc.constantFrom(...ACCEPTED_IMAGE_TYPES), (type) => {
                // Documented rather than assumed: the backend's fileFilter compares verbatim, so
                // a client-side check that lowercased first would accept files the server then
                // rejects — a worse experience than rejecting early.
                expect(isAcceptedImageType(makeFile(type.toUpperCase(), 1))).toBe(false);
            }),
            RUN
        ));

    it('treats the size limit as inclusive, on both sides of the boundary', () =>
        fc.assert(
            fc.property(fc.nat(), (size) => {
                expect(isWithinUploadSizeLimit(makeFile('image/png', size))).toBe(
                    size <= MAX_UPLOAD_BYTES
                );
            }),
            RUN
        ));

    /*
     * The exact boundary — `MAX_UPLOAD_BYTES` and one byte over — is NOT asserted here. It is
     * already an example in `uploads.spec.ts` ("accepts a file of exactly the limit and rejects
     * one byte more"), and restating it was a straight duplicate. The property above covers the
     * whole range; that one pins the single value `fc.nat()` would only reach by luck.
     */

    it('renders every size as a positive-looking MB label', () =>
        fc.assert(
            fc.property(fc.nat(), (bytes) => {
                const label = formatUploadSize(bytes);
                expect(label).toMatch(/^\d+(\.\d)? MB$/);
                // `Number(...toFixed(1))` drops a trailing ".0", which is the whole reason the
                // conversion is written that way — "5 MB", not "5.0 MB".
                expect(label).not.toMatch(/\.0 MB$/);
            }),
            RUN
        ));

    it('is monotonic in bytes', () =>
        fc.assert(
            fc.property(fc.nat(), fc.nat(), (a, b) => {
                fc.pre(a < b);
                const sizeA = Number.parseFloat(formatUploadSize(a));
                const sizeB = Number.parseFloat(formatUploadSize(b));
                // Rounding may make them equal; it must never invert them.
                expect(sizeA).toBeLessThanOrEqual(sizeB);
            }),
            RUN
        ));
});
