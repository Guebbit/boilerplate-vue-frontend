/**
 * `tests/support/unit/expect-warning.ts`: the watcher that fails a test on an undeclared `[Vue warn]`.
 *
 * Each case drives a watcher against a fake console, never the real one the setup file already
 * watches, so a failure here is the watcher's and not a leak from the harness.
 */
import { describe, expect, it, vi } from 'vitest';
import { createWarningWatcher, expectWarning } from '../../support/unit/expect-warning.ts';

/** A console with spy methods, and the watcher around it, already started. */
const watched = () => {
    const original = { warn: vi.fn(), error: vi.fn() };
    const target = { ...original };
    const watcher = createWarningWatcher(target);
    watcher.start();
    return { target, original, watcher };
};

describe('createWarningWatcher', () => {
    it('fails on a Vue warning nobody declared, and names it', () => {
        const { target, watcher } = watched();

        target.warn('[Vue warn]: Extraneous non-props attributes (class)');

        expect(() => watcher.finish()).toThrow(
            'Unexpected Vue warning: [Vue warn]: Extraneous non-props attributes (class)'
        );
    });

    it('catches a Vue warning that arrives through console.error', () => {
        const { target, watcher } = watched();

        target.error('[Vue warn]: Unhandled error during execution');

        expect(() => watcher.finish()).toThrow('Unexpected Vue warning');
    });

    it('ignores every message without the Vue prefix, as the app logger and [intlify] write them', () => {
        const { target, watcher } = watched();

        target.warn('[intlify] Not found key');
        target.error('request failed', new Error('boom'));
        target.warn(42);

        expect(() => watcher.finish()).not.toThrow();
    });

    it('accepts a declared warning, by substring or by pattern', () => {
        const { target, watcher } = watched();
        watcher.expect('deprecated');
        watcher.expect(/Extraneous/);

        target.warn('[Vue warn]: theme.global.name is deprecated');
        target.warn('[Vue warn]: Extraneous non-props attributes');

        expect(() => watcher.finish()).not.toThrow();
    });

    it('fails a declaration that never fired, so a stale one cannot linger', () => {
        const { watcher } = watched();
        watcher.expect('deprecated');

        expect(() => watcher.finish()).toThrow('Declared Vue warning never fired: deprecated');
    });

    it('still prints: the call reaches the console it wrapped', () => {
        const { target, original, watcher } = watched();
        const { warn } = original;

        target.warn('[Vue warn]: seen');
        watcher.expect('seen');
        watcher.finish();

        expect(warn).toHaveBeenCalledWith('[Vue warn]: seen');
    });

    it('puts the console back at the end', () => {
        const { target, original, watcher } = watched();

        watcher.finish();

        expect(target.warn).toBe(original.warn);
        expect(target.error).toBe(original.error);
    });

    it('starts each test empty: a warning from the last one is not carried over', () => {
        const { target, watcher } = watched();
        target.warn('[Vue warn]: old');
        expect(() => watcher.finish()).toThrow();

        watcher.start();

        expect(() => watcher.finish()).not.toThrow();
    });
});

describe('expectWarning', () => {
    it('declares a warning on the watcher the setup file runs, so the test that provokes one passes', () => {
        expect(() => expectWarning('[Vue warn]: made on purpose')).not.toThrow();

        // The real console on purpose: the setup file's afterEach is what must accept this warning.
        // eslint-disable-next-line no-console -- provoking a Vue warning through the real console is the case under test
        console.warn('[Vue warn]: made on purpose');
    });
});
