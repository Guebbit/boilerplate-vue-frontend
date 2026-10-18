/**
 * @module
 * `useCopyToClipboard` — the outcome of a copy is always on a toast: the success text when the
 * clipboard took it, the caller's own failure text, as a danger toast, when it did not.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { EToastType } from '@guebbit/vue-toolkit';
import { useCopyToClipboard } from '@/ui/composables/use-copy-to-clipboard.ts';
import { i18n, loadLocale } from '@/i18n';
import enMessages from '@/locales/en.json';

// Hoisted: the two toolkit mocks below are evaluated before any later top-level `const`.
const { addMessageMock, copyToClipboardMock } = vi.hoisted(() => ({
    addMessageMock: vi.fn(),
    copyToClipboardMock: vi.fn()
}));

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
 * A render function with nothing to draw: the component exists only to host `setup`.
 *
 * @returns Nothing.
 */
const renderNothing = () => null;

/**
 * Runs the composable inside a component's setup, the only place it can read its contexts.
 *
 * @returns The copy function it built.
 */
const build = (): ((text: string) => Promise<void>) => {
    let copy: ((text: string) => Promise<void>) | undefined;
    mount(
        defineComponent({
            setup() {
                copy = useCopyToClipboard('generic.secret-reveal-copy-failed');
                return renderNothing;
            }
        }),
        { global: { plugins: [i18n] } }
    );
    if (!copy) throw new Error('setup did not run');
    return copy;
};

describe('useCopyToClipboard', () => {
    it('hands the text to the clipboard and toasts the success', () => {
        copyToClipboardMock.mockResolvedValue(true);

        return build()('req-0123456789').then(() => {
            expect(copyToClipboardMock).toHaveBeenCalledWith('req-0123456789');
            expect(addMessageMock).toHaveBeenCalledExactlyOnceWith(
                enMessages.generic['secret-reveal-copied']
            );
        });
    });

    it('toasts the caller’s failure text as a danger when the clipboard refuses', () => {
        copyToClipboardMock.mockResolvedValue(false);

        return build()('req-0123456789').then(() => {
            expect(addMessageMock).toHaveBeenCalledExactlyOnceWith(
                enMessages.generic['secret-reveal-copy-failed'],
                EToastType.DANGER
            );
        });
    });
});
