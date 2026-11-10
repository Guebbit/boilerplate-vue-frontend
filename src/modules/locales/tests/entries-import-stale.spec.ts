/**
 * @module
 * An import answered 412 (a dictionary write landed since the list was read) says so inside the
 * dialog, offers "reload latest", and reload re-reads the list instead of resending the file.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { listLocaleEntries, updateLocaleEntries } from '@api';
import LocaleEntries from '../views/LocaleEntries.vue';
import EntriesImportDialog from '../components/EntriesImportDialog.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aProblem } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/** An empty entries page for either entries read. */
const emptyPage = () => Promise.resolve({ items: [], meta: { totalItems: 0, totalPages: 0 } });

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    listLocaleEntries: vi.fn(() => emptyPage()),
    listAppLocaleEntries: vi.fn(() => emptyPage()),
    updateLocaleEntries: vi.fn(),
    listLocales: vi.fn(() => Promise.resolve({ locales: [], default: 'en', fallback: 'en' })),
    listLocaleApps: vi.fn(() => Promise.resolve({ apps: [] }))
}));

/** The real route tree, so the screen's links resolve. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    vi.mocked(updateLocaleEntries).mockRejectedValue(
        aProblem(412, [{ code: 'PRECONDITION_FAILED', message: 'Precondition failed' }])
    );
    return loadLocale('en');
});

describe('LocaleEntries stale import', () => {
    it('warns on a 412 and reloads the list on request, without resending the import', async () => {
        await router.push('/en/locales/it');
        const wrapper = mount(LocaleEntries, {
            global: { plugins: [router, vuetify, i18n], stubs: { RouterLink: true } }
        });
        await flushPromises();

        // The dialog's slot is teleported and rendered only while it is open.
        await wrapper.get('[data-test=entries-import-open]').trigger('click');
        await flushPromises();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- an SFC's `vm` has no resolvable type under typed lint; the call is the dialog's own `import` event, the one thing this test must raise
        wrapper.findComponent(EntriesImportDialog).vm.$emit('import', {
            mode: 'merge',
            app: 'demo-fe',
            entries: []
        });
        await flushPromises();
        const readsBefore = vi.mocked(listLocaleEntries).mock.calls.length;
        const reload = document.body.querySelector<HTMLElement>(
            '[data-test=entries-import-reload-latest]'
        );
        expect(reload).not.toBeNull();
        reload?.click();
        await flushPromises();

        expect(updateLocaleEntries).toHaveBeenCalledTimes(1);
        // Unmounted so the teleported dialog leaves the document body.
        wrapper.unmount();
        expect(vi.mocked(listLocaleEntries).mock.calls.length).toBeGreaterThan(readsBefore);
    });
});
