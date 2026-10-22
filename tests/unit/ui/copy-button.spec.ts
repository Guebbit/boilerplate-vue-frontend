/**
 * `CopyButton.vue` — the icon button that copies one text. The clipboard is mocked at the
 * toolkit's `copyToClipboard`; what is asserted is the button's own contract: a glyph is always
 * present, the accessible name is the caller's, and a click copies exactly the given text.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CopyButton from '@/ui/molecules/CopyButton.vue';
import vuetify from '@/ui/vuetify';
import { i18n, loadLocale } from '@/i18n';

const { copyToClipboardMock } = vi.hoisted(() => ({ copyToClipboardMock: vi.fn() }));

vi.mock('@guebbit/js-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/js-toolkit')>()),
    copyToClipboard: copyToClipboardMock
}));

beforeAll(() => loadLocale('en'));

beforeEach(() => {
    setActivePinia(createPinia());
    copyToClipboardMock.mockReset();
    copyToClipboardMock.mockResolvedValue(true);
});

/** Mounts the button with a text, a name and a failure key. */
const mountButton = () =>
    mount(CopyButton, {
        props: {
            text: 'IT60X0542811101000000123456',
            label: 'Copy the IBAN',
            failureKey: 'generic.secret-reveal-copy-failed'
        },
        attrs: { 'data-test': 'copy-iban' },
        global: { plugins: [vuetify, i18n] }
    });

describe('CopyButton', () => {
    it('renders an icon, named by the caller, with the caller’s test hook', () => {
        const wrapper = mountButton();

        expect(wrapper.find('svg').exists()).toBe(true);
        expect(wrapper.get('button').attributes('aria-label')).toBe('Copy the IBAN');
        expect(wrapper.attributes('data-test')).toBe('copy-iban');
    });

    it('copies exactly the given text on click', () => {
        const wrapper = mountButton();

        return wrapper
            .get('button')
            .trigger('click')
            .then(() =>
                expect(copyToClipboardMock).toHaveBeenCalledWith('IT60X0542811101000000123456')
            );
    });
});
