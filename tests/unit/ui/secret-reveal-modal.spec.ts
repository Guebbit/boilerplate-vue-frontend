/**
 * `SecretRevealModal.vue` — the copy-to-clipboard button is the one bit of logic in an otherwise
 * static dialog, and its failure path used to be silent: `copyToClipboard` resolving `false`
 * (permission denied, no Clipboard API and `execCommand` refused too) left the visitor thinking
 * the one-time secret was copied when it was not, with no way back to it once the dialog closes.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { EToastType } from '@guebbit/vue-toolkit';
import SecretRevealModal from '@/ui/organisms/SecretRevealModal.vue';
import vuetify from '@/ui/vuetify';
import { i18n, loadLocale } from '@/i18n';
import enMessages from '@/locales/en.json';

// `vi.hoisted` rather than a plain top-level `const`: `@guebbit/vue-toolkit`'s own import graph
// pulls in `@guebbit/js-toolkit` while its mock factory below runs, which can evaluate BOTH
// factories before a later `const` in this file would otherwise have run.
const { addMessageMock, copyToClipboardMock } = vi.hoisted(() => ({
    addMessageMock: vi.fn(),
    copyToClipboardMock: vi.fn()
}));

// `EToastType` stays real (it is a plain enum the component branches on); only `addMessage` is a
// spy, so the assertions below can read what severity the toast actually carried.
vi.mock('@guebbit/vue-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/vue-toolkit')>()),
    useNotificationsStore: () => ({ addMessage: addMessageMock })
}));

vi.mock('@guebbit/js-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/js-toolkit')>()),
    copyToClipboard: copyToClipboardMock
}));

beforeAll(() => loadLocale('en'));

beforeEach(() => {
    addMessageMock.mockClear();
    copyToClipboardMock.mockReset();
});

/** Mounts the modal with a secret to reveal. */
const mountModal = () =>
    mount(SecretRevealModal, {
        props: { secret: 'top-secret-value' },
        global: { plugins: [vuetify, i18n] }
    });

/** Clicks the copy button — the only `v-btn` with an icon and no visible text. */
const clickCopy = (wrapper: ReturnType<typeof mountModal>) =>
    wrapper.find('button[aria-label]').trigger('click');

describe('SecretRevealModal — copying the secret', () => {
    it('toasts success once the clipboard write resolves true', () => {
        copyToClipboardMock.mockReturnValue(Promise.resolve(true));

        return clickCopy(mountModal()).then(() =>
            vi.waitFor(() => {
                expect(addMessageMock).toHaveBeenCalledWith(
                    enMessages.generic['secret-reveal-copied']
                );
            })
        );
    });

    it('toasts a DANGER failure instead of swallowing a copy that resolves false', () => {
        copyToClipboardMock.mockReturnValue(Promise.resolve(false));

        return clickCopy(mountModal()).then(() =>
            vi.waitFor(() => {
                expect(addMessageMock).toHaveBeenCalledWith(
                    enMessages.generic['secret-reveal-copy-failed'],
                    EToastType.DANGER
                );
            })
        );
    });
});
