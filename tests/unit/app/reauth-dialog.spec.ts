/**
 * `ReauthDialog` (FA123/FA131) — never mounted anywhere before this: `step-up.spec.ts` says so
 * explicitly, driving `useReauthPromptStore()` directly to cover the INTERCEPTOR's park/replay
 * mechanics instead. This is the other half — the dialog's own job once the store is open: submit
 * calls `useAuthStore().reauth()`, success resolves the prompt, a wrong password shows inline and
 * stays open, and closing any other way (cancel) rejects it.
 *
 * `useReauthPromptStore` is the REAL store, not mocked — its open/close wiring is exactly what
 * this component exists to drive, so faking it would test nothing. `useAuthStore` is mocked: its
 * own `reauth()` call is `auth.spec.ts`'s job, not this dialog's.
 *
 * The 401-vs-anything-else branch this dialog's error message takes is a separate, narrower
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
const reauthing = ref(false);

vi.mock('@/modules/account/stores/auth.ts', () => ({
    useAuthStore: () => ({ reauth, reauthing })
}));

const mountDialog = () =>
    mount(ReauthDialog, {
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    reauth.mockReset();
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

        return nextRenderTick(wrapper).then(() => {
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

        return nextRenderTick(wrapper).then(() =>
            wrapper
                .get('[data-test="reauth-dialog-password"] input')
                .setValue('correct horse')
                .then(() => wrapper.get('[data-test="reauth-dialog-submit"]').trigger('click'))
                .then(() => {
                    expect(reauth).toHaveBeenCalledWith('correct horse');
                    return expect(stepUp).resolves.toBeUndefined();
                })
        );
    });

    it('shows an inline error and stays open when reauth() rejects', () => {
        // A 401-shaped reject, exactly as `onResponseReject` produces it — the dialog's own
        // 401-vs-anything-else branch (FA80) is what picks this fixed wording over the failure's
        // raw message, covered in full by `reauth-dialog-error-message.spec.ts`.
        reauth.mockRejectedValue({ status: 401 });
        const wrapper = mountDialog();
        // Deliberately never settles in this case: a wrong password keeps the prompt open rather
        // than rejecting the caller's promise.
        void useReauthPromptStore().requestStepUp();

        return nextRenderTick(wrapper).then(() =>
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
