/**
 * `ReauthDialog` (FA123/FA131) — never mounted anywhere before this: `step-up.spec.ts` says so
 * explicitly, driving `useReauthPromptStore()` directly to cover the INTERCEPTOR's park/replay
 * mechanics instead. This is the other half — the dialog's own job once the store is open: submit
 * calls `useSessionStore().reauth()`, success resolves the prompt, a wrong password shows inline and
 * stays open, and closing any other way (cancel) rejects it.
 *
 * `useReauthPromptStore` is the REAL store, not mocked — its open/close wiring is exactly what
 * this component exists to drive, so faking it would test nothing. `useSessionStore` is mocked: its
 * own `reauth()` call is `session.spec.ts`'s job, not this dialog's.
 *
 * The 422-vs-anything-else branch this dialog's error message takes is a separate, narrower
 * concern covered by `reauth-dialog-error-message.spec.ts` (FA80) — kept in its own file since it
 * needs a real (unstubbed) `VDialog` and an identity `t`, neither of which this file uses.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextRenderTick } from '../../support/unit/mounted-vm';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import ReauthDialog from '@/app/components/ReauthDialog.vue';
import { useReauthPromptStore } from '@/infrastructure/http/reauth-prompt.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';

const reauth = vi.fn();
const reauthMethods = vi.fn();
const sendReauthCode = vi.fn();
const reauthing = ref(false);

vi.mock('@/infrastructure/session.ts', () => ({
    reauthSendRetryAfter: (error: { retryAfter?: number }) => error.retryAfter,
    useSessionStore: () => ({ reauth, reauthMethods, sendReauthCode, reauthing })
}));

const mountDialog = () =>
    mount(ReauthDialog, {
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });

/**
 * Two render ticks: one for the prompt to open, one for the server's method list to arrive and the
 * form it selects to render.
 */
const settled = (wrapper: ReturnType<typeof mountDialog>) =>
    nextRenderTick(wrapper).then(() => nextRenderTick(wrapper));

beforeEach(() => {
    setActivePinia(createPinia());
    reauth.mockReset();
    reauthMethods.mockReset().mockResolvedValue(['password']);
    sendReauthCode.mockReset();
    reauthing.value = false;
    return loadLocale('en');
});

describe('ReauthDialog', () => {
    it('renders nothing while no step-up is pending', () => {
        expect(mountDialog().find('[data-test="reauth-dialog-password"]').exists()).toBe(false);
    });

    it('shows the password prompt once the store opens it', () => {
        const wrapper = mountDialog();
        // Never awaited in this case — settling it is what the OTHER cases below assert on.
        void useReauthPromptStore().requestStepUp();

        return settled(wrapper).then(() => {
            expect(wrapper.find('[data-test="reauth-dialog-password"]').exists()).toBe(true);
            expect(
                wrapper.find('[data-test="reauth-dialog-submit"]').attributes('disabled')
            ).toBeDefined();
        });
    });

    it('resolves the pending step-up once reauth() succeeds', () => {
        reauth.mockResolvedValue(undefined);
        const wrapper = mountDialog();
        const stepUp = useReauthPromptStore().requestStepUp();

        return settled(wrapper).then(() =>
            wrapper
                .get('[data-test="reauth-dialog-password"] input')
                .setValue('correct horse')
                .then(() => wrapper.get('[data-test="reauth-dialog-submit"]').trigger('click'))
                .then(() => {
                    expect(reauth).toHaveBeenCalledWith({
                        method: 'password',
                        password: 'correct horse'
                    });
                    return expect(stepUp).resolves.toBeUndefined();
                })
        );
    });

    it('shows an inline error and stays open when reauth() rejects', () => {
        // A 422-shaped reject, exactly as `onResponseReject` produces it — the dialog's own
        // 422-vs-anything-else branch (FA80) is what picks this fixed wording over the failure's
        // raw message, covered in full by `reauth-dialog-error-message.spec.ts`.
        reauth.mockRejectedValue({ status: 422 });
        const wrapper = mountDialog();
        // Deliberately never settles in this case: a wrong password keeps the prompt open rather
        // than rejecting the caller's promise.
        void useReauthPromptStore().requestStepUp();

        return settled(wrapper).then(() =>
            wrapper
                .get('[data-test="reauth-dialog-password"] input')
                .setValue('wrong guess')
                .then(() => wrapper.get('[data-test="reauth-dialog-submit"]').trigger('click'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(wrapper.find('[data-test="reauth-dialog-password"]').exists()).toBe(
                        true
                    );
                    expect(wrapper.text()).toContain('That password is not right. Try again.');
                })
        );
    });

    it('rejects the pending step-up when cancelled, instead of leaving it hanging', () => {
        const wrapper = mountDialog();
        const stepUp = useReauthPromptStore().requestStepUp();

        return nextRenderTick(wrapper)
            .then(() => wrapper.get('[data-test="reauth-dialog-cancel"]').trigger('click'))
            .then(() => expect(stepUp).rejects.toThrow('REAUTH_CANCELLED'));
    });
});

/** Opens the prompt for an account the server says can only use the mailed code. */
const openForEmail = () => {
    reauthMethods.mockResolvedValue(['email']);
    const wrapper = mountDialog();
    const stepUp = useReauthPromptStore().requestStepUp();
    return nextRenderTick(wrapper)
        .then(() => nextRenderTick(wrapper))
        .then(() => ({ wrapper, stepUp }));
};

describe('ReauthDialog — an account with no password', () => {
    it('offers the code flow, not a password field', () =>
        openForEmail().then(({ wrapper }) => {
            expect(wrapper.find('[data-test="reauth-dialog-password"]').exists()).toBe(false);
            expect(wrapper.find('[data-test="reauth-dialog-send"]').exists()).toBe(true);
            expect(wrapper.find('[data-test="reauth-dialog-code"]').exists()).toBe(true);
        }));

    it('sends the code, then counts the server’s cooldown down on the button', () => {
        sendReauthCode.mockResolvedValue(30);

        return openForEmail().then(({ wrapper }) =>
            wrapper
                .get('[data-test="reauth-dialog-send"]')
                .trigger('click')
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(sendReauthCode).toHaveBeenCalledOnce();
                    expect(wrapper.find('[data-test="reauth-dialog-sent"]').exists()).toBe(true);
                    expect(
                        wrapper.get('[data-test="reauth-dialog-send"]').attributes('disabled')
                    ).toBeDefined();
                    expect(wrapper.get('[data-test="reauth-dialog-send"]').text()).toContain('30');
                })
        );
    });

    it('starts the countdown from a 429’s own number when the send is refused', () => {
        sendReauthCode.mockRejectedValue({ status: 429, retryAfter: 12, message: 'Too soon' });

        return openForEmail().then(({ wrapper }) =>
            wrapper
                .get('[data-test="reauth-dialog-send"]')
                .trigger('click')
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(wrapper.get('[data-test="reauth-dialog-send"]').text()).toContain('12');
                    expect(wrapper.text()).toContain('Too soon');
                })
        );
    });

    it('resolves the step-up with the tagged email body once the code is typed', () => {
        reauth.mockResolvedValue(undefined);

        return openForEmail().then(({ wrapper, stepUp }) =>
            wrapper
                .get('[data-test="reauth-dialog-code"] input')
                .setValue('123456')
                .then(() => wrapper.get('[data-test="reauth-dialog-submit"]').trigger('click'))
                .then(() => {
                    expect(reauth).toHaveBeenCalledWith({ method: 'email', code: '123456' });
                    return expect(stepUp).resolves.toBeUndefined();
                })
        );
    });

    it('says the code is wrong, not the password, on a 422', () => {
        reauth.mockRejectedValue({ status: 422 });

        return openForEmail().then(({ wrapper }) =>
            wrapper
                .get('[data-test="reauth-dialog-code"] input')
                .setValue('000000')
                .then(() => wrapper.get('[data-test="reauth-dialog-submit"]').trigger('click'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(wrapper.text()).toContain('That code is not right');
                    expect(wrapper.text()).not.toContain('password is not right');
                })
        );
    });

    it('shows a dead end when the server offers no method', () => {
        reauthMethods.mockResolvedValue([]);
        const wrapper = mountDialog();
        void useReauthPromptStore().requestStepUp();

        return nextRenderTick(wrapper)
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(wrapper.find('[data-test="reauth-dialog-no-method"]').exists()).toBe(true);
                expect(wrapper.find('[data-test="reauth-dialog-password"]').exists()).toBe(false);
            });
    });
});
