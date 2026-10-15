/**
 * `IdleSessionDialog` — the "still there?" prompt of the staff idle timeout. It counts down from
 * the server's own numbers (`idle` on the session store), opens two minutes before the end, asks
 * the server on "stay", leaves on "sign out", and ends the session here when the clock runs out.
 * The session store is mocked: its own calls are `session.spec.ts`'s job, this file's is the dialog.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import IdleSessionDialog from '@/app/components/IdleSessionDialog.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';

/** The idle clock the mocked store reports; `undefined` is a shopper. */
const idle = ref<{ timeoutMs: number; lastActiveAt: number } | undefined>();

/** Stubs for the store actions the dialog drives. */
const touchSession = vi.fn();
const signalIdle = vi.fn();
const logout = vi.fn();

vi.mock('@/infrastructure/session.ts', () => ({
    useSessionStore: () => ({ idle, touchSession, signalIdle, logout })
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
    idle.value = { timeoutMs: LIMIT_MS, lastActiveAt: Date.now() - LIMIT_MS + seconds * 1000 };
};

beforeEach(() => {
    vi.useFakeTimers();
    idle.value = undefined;
    touchSession.mockReset().mockResolvedValue(undefined);
    signalIdle.mockReset();
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
});
