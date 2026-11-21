/**
 * `IdleSessionDialog` — the "still there?" prompt of the staff idle timeout. It counts down from
 * the server's own numbers (`idle` and `lifetimeEndsAt` on the session store), opens two minutes
 * before whichever limit ends the session first, asks the server on "stay", leaves on "sign out",
 * and ends the session here when the clock runs out. The staff lifetime cap warns too, but
 * activity cannot extend it, so it has no "stay".
 * The session store is mocked: its own calls are `session.spec.ts`'s job, this file's is the dialog.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import IdleSessionDialog from '@/app/components/IdleSessionDialog.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';

/** The idle clock the mocked store reports; `undefined` is a shopper. */
const idle = ref<{ timeoutMs: number; endsAt: number } | undefined>();

/** The lifetime cap's deadline the mocked store reports; `undefined` is no cap. */
const lifetimeEndsAt = ref<number | undefined>();

/** Stubs for the store actions the dialog drives. */
const touchSession = vi.fn();

const signalIdle = vi.fn();

const signalExpired = vi.fn();

const logout = vi.fn();

vi.mock('@/infrastructure/session.ts', () => ({
    useSessionStore: () => ({
        idle,
        lifetimeEndsAt,
        touchSession,
        signalIdle,
        signalExpired,
        logout
    })
}));

/** Thirty minutes, the staff default. */
const LIMIT_MS = 30 * 60_000;

/** Mounts the dialog with the plugins it needs, its `VDialog` replaced by a plain slot. */
const mountDialog = () =>
    mount(IdleSessionDialog, {
        global: {
            plugins: [vuetify, i18n],
            stubs: {
                VDialog: {
                    props: ['modelValue'],
                    template: '<div v-if="modelValue"><slot /></div>'
                }
            }
        }
    });

/** Sets the clock so the session has `seconds` left. */
const withSecondsLeft = (seconds: number) => {
    idle.value = { timeoutMs: LIMIT_MS, endsAt: Date.now() + seconds * 1000 };
};

/** Sets the lifetime cap so the session has `seconds` left before it. */
const withCapIn = (seconds: number) => {
    lifetimeEndsAt.value = Date.now() + seconds * 1000;
};

beforeEach(() => {
    vi.useFakeTimers();
    idle.value = undefined;
    lifetimeEndsAt.value = undefined;
    touchSession.mockReset().mockResolvedValue(undefined);
    signalIdle.mockReset();
    signalExpired.mockReset();
    logout.mockReset();
    return loadLocale('en');
});

afterEach(() => {
    vi.useRealTimers();
});

describe('IdleSessionDialog', () => {
    it('renders nothing for a shopper, whose session never idles out', () => {
        const wrapper = mountDialog();

        vi.advanceTimersByTime(5000);

        expect(wrapper.find('[data-test="idle-session-dialog"]').exists()).toBe(false);
    });

    it('stays closed while there is more than two minutes left', async () => {
        withSecondsLeft(600);
        const wrapper = mountDialog();

        await vi.advanceTimersByTimeAsync(2000);

        expect(wrapper.find('[data-test="idle-session-dialog"]').exists()).toBe(false);
    });

    it('opens inside the warning window, counting down', async () => {
        withSecondsLeft(100);
        const wrapper = mountDialog();

        await vi.advanceTimersByTimeAsync(1000);

        expect(wrapper.find('[data-test="idle-session-dialog"]').text()).toContain('1:39');
    });

    it('asks the server on "stay signed in"', async () => {
        withSecondsLeft(60);
        const wrapper = mountDialog();
        await vi.advanceTimersByTimeAsync(1000);

        await wrapper.find('[data-test="idle-session-stay"]').trigger('click');

        expect(touchSession).toHaveBeenCalledTimes(1);
    });

    it('signs out on "sign out"', async () => {
        withSecondsLeft(60);
        const wrapper = mountDialog();
        await vi.advanceTimersByTimeAsync(1000);

        await wrapper.find('[data-test="idle-session-leave"]').trigger('click');

        expect(logout).toHaveBeenCalledTimes(1);
    });

    it('ends the session here when the clock runs out', async () => {
        withSecondsLeft(3);
        mountDialog();

        await vi.advanceTimersByTimeAsync(4000);

        expect(signalIdle).toHaveBeenCalled();
    });

    describe('the staff lifetime cap', () => {
        it('warns before the cap when it ends the session first, with no "stay" button', async () => {
            withSecondsLeft(1500);
            withCapIn(100);
            const wrapper = mountDialog();

            await vi.advanceTimersByTimeAsync(1000);

            const dialog = wrapper.find('[data-test="idle-session-dialog"]');
            expect(dialog.text()).toContain('1:39');
            expect(dialog.text()).toContain('Save your work');
            expect(wrapper.find('[data-test="idle-session-stay"]').exists()).toBe(false);
        });

        it('warns about the cap for a staff member whose idle timeout is off', async () => {
            withCapIn(100);
            const wrapper = mountDialog();

            await vi.advanceTimersByTimeAsync(1000);

            expect(wrapper.find('[data-test="idle-session-dialog"]').exists()).toBe(true);
        });

        it('still asks "stay signed in" when idle ends the session first', async () => {
            withSecondsLeft(100);
            withCapIn(5000);
            const wrapper = mountDialog();

            await vi.advanceTimersByTimeAsync(1000);

            expect(wrapper.find('[data-test="idle-session-stay"]').exists()).toBe(true);
            expect(wrapper.find('[data-test="idle-session-dismiss"]').exists()).toBe(false);
        });

        it('closes on "I\'ll save my work" so the work can be saved, and stays closed', async () => {
            withCapIn(100);
            const wrapper = mountDialog();
            await vi.advanceTimersByTimeAsync(1000);

            await wrapper.find('[data-test="idle-session-dismiss"]').trigger('click');
            await vi.advanceTimersByTimeAsync(5000);

            expect(wrapper.find('[data-test="idle-session-dialog"]').exists()).toBe(false);
        });

        it('stays closed when a later answer re-reads the deadline', async () => {
            withCapIn(100);
            const wrapper = mountDialog();
            await vi.advanceTimersByTimeAsync(1000);
            await wrapper.find('[data-test="idle-session-dismiss"]').trigger('click');

            // Every answer shifts the deadline by the time it took to arrive: seconds.
            lifetimeEndsAt.value = Date.now() + 99_000;
            await vi.advanceTimersByTimeAsync(1000);

            expect(wrapper.find('[data-test="idle-session-dialog"]').exists()).toBe(false);
        });

        it('warns again for a NEW session, whose deadline is hours away from the dismissed one', async () => {
            withCapIn(100);
            const wrapper = mountDialog();
            await vi.advanceTimersByTimeAsync(1000);
            await wrapper.find('[data-test="idle-session-dismiss"]').trigger('click');

            // A sign-in in another tab: a day-long cap, then the clock reaches its last 100 s.
            lifetimeEndsAt.value = Date.now() + 86_400_000;
            await vi.advanceTimersByTimeAsync(86_400_000 - 100_000);

            expect(wrapper.find('[data-test="idle-session-dialog"]').exists()).toBe(true);
        });

        it('ends the session as an expiry, not as inactivity, when the cap runs out', async () => {
            withCapIn(3);
            mountDialog();

            await vi.advanceTimersByTimeAsync(4000);

            expect(signalExpired).toHaveBeenCalled();
            expect(signalIdle).not.toHaveBeenCalled();
        });
    });
});
