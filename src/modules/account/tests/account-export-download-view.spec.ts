/**
 * @module
 * Mounts the page the "your data export is ready" mail links to: it reads the export's status
 * (over the shared MSW server) but downloads nothing until the visitor presses the button, saves
 * what the API sends under the server's file name, and blocks in place when the file is gone.
 * `downloadAccountExport` is spied at the profile store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { http, HttpResponse } from 'msw';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { downloadBlob } from '@guebbit/js-toolkit';
import AccountExportDownload from '../views/AccountExportDownload.vue';
import { useProfileStore } from '../stores/profile.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { server } from '../../../../tests/support/unit/msw-server.ts';
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

/**
 * Answers the status read with an export, or with the 404 of an account that has none.
 *
 * @param body - The export, or `undefined` for none.
 */
const statusIs = (body?: Record<string, unknown>) =>
    server.use(
        http.get('*/account/export', () =>
            body
                ? HttpResponse.json(body)
                : HttpResponse.json(aProblem(404, [{ code: 'NOT_FOUND', message: 'No export.' }]), {
                      status: 404,
                      headers: { 'Content-Type': 'application/problem+json' }
                  })
        )
    );

/** A ready export, kept for a week. */
const READY = {
    id: 'e1',
    status: 'ready',
    actions: { download: true, request: true },
    createdAt: '2026-09-07T09:00:00.000Z',
    expiresAt: '2026-09-14T10:00:00.000Z'
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    statusIs(READY);
    return loadLocale('en').then(() =>
        router.push('/en/account-export').then(() => router.isReady())
    );
});

describe('AccountExportDownload status', () => {
    it('offers the download, and says until when, for a ready export', () => {
        const { wrapper } = mountPage();

        return flushPromises().then(() => {
            expect(wrapper.text()).toContain('kept until');
            expect(
                wrapper.get('[data-test=account-export-download]').attributes('disabled')
            ).toBeUndefined();
        });
    });

    it('says it is still being built, with the download held back', () => {
        statusIs({ ...READY, status: 'building', expiresAt: undefined });
        const { wrapper } = mountPage();

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=account-export-building]').exists()).toBe(true);
            expect(
                wrapper.get('[data-test=account-export-download]').attributes('disabled')
            ).toBeDefined();
        });
    });

    it('says the last export failed, with the download held back', () => {
        statusIs({ ...READY, status: 'failed', expiresAt: undefined });
        const { wrapper } = mountPage();

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=account-export-failed]').exists()).toBe(true);
            expect(
                wrapper.get('[data-test=account-export-download]').attributes('disabled')
            ).toBeDefined();
        });
    });

    it('says an export is kept for a few days only once it knows there is none', () => {
        statusIs();
        const { wrapper } = mountPage();

        expect(wrapper.find('[data-test=account-export-none]').exists()).toBe(false);
        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=account-export-none]').exists()).toBe(true);
            expect(
                wrapper.get('[data-test=account-export-download]').attributes('disabled')
            ).toBeDefined();
        });
    });
});

describe('AccountExportDownload', () => {
    it('fetches nothing on arrival, so a link prefetched by a mail scanner costs nothing', () => {
        const { download } = mountPage();

        expect(download).not.toHaveBeenCalled();
    });

    it('fetches the export the link names and saves it under the name the server gave it', () => {
        const { wrapper, download } = mountPage();
        download.mockResolvedValue(EXPORT_FILE);

        return flushPromises()
            .then(() => wrapper.get('[data-test=account-export-download]').trigger('click'))
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

        return flushPromises()
            .then(() => wrapper.get('[data-test=account-export-download]').trigger('click'))
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
            aProblem(500, [{ code: 'INTERNAL_SERVER_ERROR', message: 'Something broke.' }])
        );

        return flushPromises()
            .then(() => wrapper.get('[data-test=account-export-download]').trigger('click'))
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

        return flushPromises()
            .then(() => wrapper.get('[data-test=account-export-download]').trigger('click'))
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

        return flushPromises()
            .then(() => button.trigger('click'))
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
