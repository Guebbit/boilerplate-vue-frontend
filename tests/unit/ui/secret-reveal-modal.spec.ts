/**
 * `SecretRevealModal.vue` — the copy-to-clipboard button is the one bit of logic in an otherwise
 * static dialog, and its failure path used to be silent: `copyToClipboard` resolving `false`
 * (permission denied, no Clipboard API and `execCommand` refused too) left the visitor thinking
 * the one-time secret was copied when it was not, with no way back to it once the dialog closes.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
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

/**
 * Mounts the modal. `VDialog` is a pass-through: the real one teleports its card to `document.body`,
 * and what is under test is the modal's own wiring, not Vuetify's overlay.
 */
const mountModal = (props: { secret?: string }) =>
    mount(SecretRevealModal, {
        props,
        global: {
            plugins: [vuetify, i18n],
            stubs: {
                VDialog: {
                    props: ['modelValue'],
                    template: '<div v-if="modelValue" v-bind="$attrs"><slot /></div>'
                }
            }
        }
    });

/** Clicks the copy button — the only `v-btn` with an icon and no visible text. */
const clickCopy = (wrapper: ReturnType<typeof mountModal>) =>
    wrapper.find('button[aria-label]').trigger('click');

describe('SecretRevealModal — copying the secret', () => {
    it('toasts success once the clipboard write resolves true', () => {
        copyToClipboardMock.mockReturnValue(Promise.resolve(true));

        return clickCopy(mountModal({ secret: 'top-secret-value' })).then(() =>
            vi.waitFor(() => {
                expect(addMessageMock).toHaveBeenCalledWith(enMessages.generic.copied);
            })
        );
    });

    it('toasts a DANGER failure instead of swallowing a copy that resolves false', () => {
        copyToClipboardMock.mockReturnValue(Promise.resolve(false));

        return clickCopy(mountModal({ secret: 'top-secret-value' })).then(() =>
            vi.waitFor(() => {
                expect(addMessageMock).toHaveBeenCalledWith(
                    enMessages.generic['secret-reveal-copy-failed'],
                    EToastType.DANGER
                );
            })
        );
    });
});

describe('SecretRevealModal — owning its dialog', () => {
    it('shows the card while a secret is set and nothing once it is cleared', () => {
        const wrapper = mountModal({ secret: 'top-secret-value' });
        expect(wrapper.find('[data-test=secret-reveal-value]').text()).toBe('top-secret-value');

        return wrapper
            .setProps({ secret: undefined })
            .then(() => expect(wrapper.find('[data-test=secret-reveal]').exists()).toBe(false));
    });

    it('is named by its own title, and two instances on one page get distinct ids', () => {
        const wrapper = mount(
            defineComponent({
                components: { SecretRevealModal },
                template:
                    '<div><SecretRevealModal secret="a" /><SecretRevealModal secret="b" /></div>'
            }),
            {
                global: {
                    plugins: [vuetify, i18n],
                    stubs: {
                        VDialog: {
                            props: ['modelValue'],
                            template: '<div v-if="modelValue" v-bind="$attrs"><slot /></div>'
                        }
                    }
                }
            }
        );
        const titles = wrapper.findAll('.v-card-title').map((title) => title.attributes('id'));
        const named = wrapper
            .findAll('[aria-labelledby]')
            .map((dialog) => dialog.attributes('aria-labelledby'));

        expect(titles).toHaveLength(2);
        expect(titles[0]).not.toBe(titles[1]);
        expect(named).toEqual(titles);
    });
});
