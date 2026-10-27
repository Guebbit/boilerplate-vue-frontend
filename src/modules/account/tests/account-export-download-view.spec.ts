/**
 * @module
 * Mounts the page the "your data export is ready" mail links to: it fetches nothing until the
 * visitor presses the button, saves what the API sends under the server's file name, and blocks in place
 * when the export is gone. `downloadAccountExport` is spied at the profile store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { downloadBlob } from '@guebbit/js-toolkit';
import AccountExportDownload from '../views/AccountExportDownload.vue';
import { useProfileStore } from '../stores/profile.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aProblem } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

// `downloadBlob` saves through a throwaway link, which jsdom cannot do; what matters is what it
// is handed.
vi.mock('@guebbit/js-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/js-toolkit')>()),
    downloadBlob: vi.fn()
}));

/**
 * The real app router — the page reads its export id off the route.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts the page with the store call spied BEFORE mount — the view destructures it at setup.
 *
 * @returns The wrapper and the spy each case configures.
 */
const mountPage = () => {
    const download = vi.spyOn(useProfileStore(), 'downloadAccountExport');
    const wrapper = mount(AccountExportDownload, { global: { plugins: [router, vuetify, i18n] } });
    return { wrapper, download };
};

/** The export as the HTTP layer hands it over: a file, named by the server. */
const EXPORT_FILE = new File(['{"profile":{"id":"u1"}}'], 'account-export-2026-09-07.json', {
    type: 'application/json'
});

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return loadLocale('en').then(() =>
        router.push('/en/account-export').then(() => router.isReady())
    );
});

describe('AccountExportDownload', () => {
    it('fetches nothing on arrival, so a link prefetched by a mail scanner costs nothing', () => {
        const { download } = mountPage();

        expect(download).not.toHaveBeenCalled();
    });

    it('fetches the export the link names and saves it under the name the server gave it', () => {
        const { wrapper, download } = mountPage();
        download.mockResolvedValue(EXPORT_FILE);

        return wrapper
            .get('[data-test=account-export-download]')
            .trigger('click')
            .then(flushPromises)
            .then(() => {
                expect(download).toHaveBeenCalledExactlyOnceWith();
                expect(downloadBlob).toHaveBeenCalledExactlyOnceWith(
                    EXPORT_FILE,
                    'account-export-2026-09-07.json'
                );
                expect(wrapper.find('[data-test=account-export-saved]').exists()).toBe(true);
                expect(wrapper.find('[data-test=account-export-error]').exists()).toBe(false);
            });
    });

    it('blocks in place, with a hint, when the export is gone — and saves nothing', () => {
        const { wrapper, download } = mountPage();
        download.mockRejectedValue(
            aProblem(404, [{ code: 'NOT_FOUND', message: 'Export not found.' }])
        );

        return wrapper
            .get('[data-test=account-export-download]')
            .trigger('click')
            .then(flushPromises)
            .then(() => {
                expect(downloadBlob).not.toHaveBeenCalled();
                expect(wrapper.get('[data-test=account-export-error]').text()).toContain(
                    'Export not found.'
                );
                expect(wrapper.text()).toContain('Request a new one from your profile');
                expect(wrapper.find('[data-test=account-export-saved]').exists()).toBe(false);
            });
    });

    it('keeps the "kept for a few days" hint to a 404: a server failure is not an expired export', () => {
        const { wrapper, download } = mountPage();
        download.mockRejectedValue(
            aProblem(500, [{ code: 'INTERNAL_ERROR', message: 'Something broke.' }])
        );

        return wrapper
            .get('[data-test=account-export-download]')
            .trigger('click')
            .then(flushPromises)
            .then(() => {
                expect(wrapper.get('[data-test=account-export-error]').text()).toContain(
                    'Something broke.'
                );
                expect(wrapper.text()).not.toContain('Request a new one from your profile');
            });
    });

    it('saves nothing and claims nothing when the API answers with no body', () => {
        const { wrapper, download } = mountPage();
        download.mockResolvedValue(undefined);

        return wrapper
            .get('[data-test=account-export-download]')
            .trigger('click')
            .then(flushPromises)
            .then(() => {
                expect(downloadBlob).not.toHaveBeenCalled();
                expect(wrapper.find('[data-test=account-export-saved]').exists()).toBe(false);
                expect(wrapper.find('[data-test=account-export-error]').exists()).toBe(false);
            });
    });

    it('disables the button while the download is in flight, so a double click asks once', () => {
        const { wrapper, download } = mountPage();
        let finish: ((value: File) => void) | undefined;
        download.mockReturnValue(
            new Promise<File>((resolve) => {
                finish = resolve;
            })
        );
        const button = wrapper.get('[data-test=account-export-download]');

        return button
            .trigger('click')
            .then(() => {
                expect(button.attributes('disabled')).toBeDefined();
                return button.trigger('click');
            })
            .then(() => {
                expect(download).toHaveBeenCalledTimes(1);
                finish?.(EXPORT_FILE);
                return flushPromises();
            })
            .then(() => {
                expect(button.attributes('disabled')).toBeUndefined();
            });
    });
});
