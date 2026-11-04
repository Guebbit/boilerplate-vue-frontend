/**
 * @module
 * `use-password-breach-check.ts` — the debounce that keeps a hint form from hammering
 * `POST /account/password/check` on every keystroke, same fake-timers approach as
 * `cart/tests/use-line-quantity.spec.ts`: the delay is the subject, so a real wait would make this
 * suite slow AND flaky.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { effectScope, type EffectScope } from 'vue';
import { usePasswordBreachCheck } from '../composables/use-password-breach-check.ts';
import { checkPasswordBreached } from '@api';
import type { PasswordCheck } from '@types';

vi.mock('@api', () => ({ checkPasswordBreached: vi.fn() }));

/** Milliseconds the fake timers advance so the debounced check fires. */
const DELAY = 500;

/** The real body `checkPasswordBreached` resolves with. */
const envelope = (breached: boolean): Promise<PasswordCheck> => Promise.resolve({ breached });

/**
 * The scope each case runs the composable in. `onScopeDispose` registers on the active scope, and
 * outside one Vue warns, so a bare call would fail the case on that warning.
 */
let scope: EffectScope;

/** Runs the composable inside this case's scope, as a component's `setup` would. */
const useCheck = () => scope.run(() => usePasswordBreachCheck(DELAY))!;

beforeEach(() => {
    scope = effectScope();
    vi.useFakeTimers();
    vi.mocked(checkPasswordBreached).mockReset();
});

afterEach(() => {
    scope.stop();
    vi.useRealTimers();
});

describe('debouncing', () => {
    it('sends ONE request for a burst of keystrokes, for the last value typed', () => {
        vi.mocked(checkPasswordBreached).mockReturnValue(envelope(false));
        const { check } = useCheck();

        check('p');
        check('pa');
        check('pas');
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(checkPasswordBreached).toHaveBeenCalledExactlyOnceWith({ password: 'pas' });
        });
    });

    it('cancels a pending check when the owning scope is disposed (leaving the form early)', () => {
        vi.mocked(checkPasswordBreached).mockReturnValue(envelope(true));
        const { check } = useCheck();

        check('password1');
        scope.stop();
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(checkPasswordBreached).not.toHaveBeenCalled();
        });
    });

    it('cancels a pending check and clears the flag for an emptied field', () => {
        vi.mocked(checkPasswordBreached).mockReturnValue(envelope(true));
        const { breached, check } = useCheck();

        check('password1');
        check('');
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(checkPasswordBreached).not.toHaveBeenCalled();
            expect(breached.value).toBe(false);
        });
    });
});

describe('the verdict', () => {
    it('flags a breached candidate once the server answers', () => {
        vi.mocked(checkPasswordBreached).mockReturnValue(envelope(true));
        const { breached, check } = useCheck();

        check('password1');
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(breached.value).toBe(true);
        });
    });

    it('never alarms on a failed check — advisory only', () => {
        vi.mocked(checkPasswordBreached).mockRejectedValue(new Error('network'));
        const { breached, check } = useCheck();

        check('password1');
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(breached.value).toBe(false);
        });
    });

    it('drops an answer superseded by a newer request', () => {
        // First candidate resolves breached but SLOW; second, clean, resolves first.
        let resolveFirst: (() => void) | undefined;
        vi.mocked(checkPasswordBreached)
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveFirst = () => resolve(envelope(true));
                    })
            )
            .mockReturnValueOnce(envelope(false));
        const { breached, check } = useCheck();

        check('firstCandidate1');
        return vi
            .advanceTimersByTimeAsync(DELAY)
            .then(() => {
                check('secondCandidate1');
                return vi.advanceTimersByTimeAsync(DELAY);
            })
            .then(() => {
                // The second, faster answer landed; only now does the first (stale) one resolve.
                resolveFirst?.();
                return flushPromises();
            })
            .then(() => {
                expect(breached.value).toBe(false);
            });
    });
});
