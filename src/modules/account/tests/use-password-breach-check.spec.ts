/**
 * @module
 * `use-password-breach-check.ts` — the debounce that keeps a hint form from hammering
 * `POST /account/password/check` on every keystroke, same fake-timers approach as
 * `cart/tests/use-line-quantity.spec.ts`: the delay is the subject, so a real wait would make this
 * suite slow AND flaky.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { effectScope } from 'vue';
import { usePasswordBreachCheck } from '@/modules/account/composables/use-password-breach-check.ts';
import { checkPasswordBreached } from '@api';
import type { PasswordCheckEnvelope } from '@types';

vi.mock('@api', () => ({ checkPasswordBreached: vi.fn() }));

/** Milliseconds the fake timers advance so the debounced check fires. */
const DELAY = 500;

/** The real success envelope `checkPasswordBreached` resolves with. */
const envelope = (breached: boolean): Promise<PasswordCheckEnvelope> =>
    Promise.resolve({ success: true, status: 200, message: 'OK', data: { breached } });

beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(checkPasswordBreached).mockReset();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('debouncing', () => {
    it('sends ONE request for a burst of keystrokes, for the last value typed', () => {
        vi.mocked(checkPasswordBreached).mockReturnValue(envelope(false));
        const { check } = usePasswordBreachCheck(DELAY);

        check('p');
        check('pa');
        check('pas');
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(checkPasswordBreached).toHaveBeenCalledExactlyOnceWith({ password: 'pas' });
        });
    });

    it('cancels a pending check when the owning scope is disposed (leaving the form early)', () => {
        vi.mocked(checkPasswordBreached).mockReturnValue(envelope(true));
        const scope = effectScope();
        const { check } = scope.run(() => usePasswordBreachCheck(DELAY))!;

        check('password1');
        scope.stop();
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(checkPasswordBreached).not.toHaveBeenCalled();
        });
    });

    it('cancels a pending check and clears the flag for an emptied field', () => {
        vi.mocked(checkPasswordBreached).mockReturnValue(envelope(true));
        const { breached, check } = usePasswordBreachCheck(DELAY);

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
        const { breached, check } = usePasswordBreachCheck(DELAY);

        check('password1');
        return vi.advanceTimersByTimeAsync(DELAY).then(() => {
            expect(breached.value).toBe(true);
        });
    });

    it('never alarms on a failed check — advisory only', () => {
        vi.mocked(checkPasswordBreached).mockRejectedValue(new Error('network'));
        const { breached, check } = usePasswordBreachCheck(DELAY);

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
        const { breached, check } = usePasswordBreachCheck(DELAY);

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
