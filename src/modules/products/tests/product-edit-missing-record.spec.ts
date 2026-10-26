/**
 * @module
 * `ProductEdit.vue` reads the admin record without the toolkit's cache, so a failed read has no
 * `watch*` `onError` to land in. A 404 or 403 must still send the visitor to the Error page (not
 * leave an empty form), and any other failure must toast instead of redirecting.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductEdit from '../views/ProductEdit.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('@/infrastructure/http', () => ({ orvalMutator: vi.fn() }));

/** Stub for the toast dispatcher the failure path writes to. */
const addMessageMock = vi.fn();

vi.mock('@guebbit/vue-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/vue-toolkit')>()),
    useNotificationsStore: () => ({ addMessage: addMessageMock })
}));

/** Router carrying every enabled module's routes. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * The envelope a failed API call rejects with: an `Error` carrying the answer's status and messages.
 *
 * @param status - the HTTP status the API answered
 * @param message - the one message in its error list
 */
const apiRefusal = (status: number, message: string) =>
    Object.assign(new Error(message), { status, errors: [{ message }] });

/** Where a missing record goes: the router's `replace`, stubbed so nothing navigates. */
const replace = vi.spyOn(router, 'replace').mockResolvedValue(undefined);

/**
 * Mounts the edit page with the admin read rejecting the given way.
 *
 * @param rejection - what `GET /products/p1/admin` rejects with
 */
const mountWithAdminRead = (rejection: Error) => {
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string }) =>
        config.url === '/products/p1/admin' ? Promise.reject(rejection) : Promise.resolve(undefined)
    );
    return router.push('/en/products/p1/edit').then(() => {
        mount(ProductEdit, { props: { id: 'p1' }, global: { plugins: [router, vuetify, i18n] } });
        return flushPromises();
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    addMessageMock.mockReset();
    replace.mockClear();
    return loadLocale('en');
});

describe('ProductEdit — the admin record is not there', () => {
    it('sends a 404 to the Error page', () => {
        return mountWithAdminRead(apiRefusal(404, 'not found')).then(() => {
            expect(replace).toHaveBeenCalledWith({
                name: 'Error',
                params: { locale: 'en', status: 404, message: 'error-page.not-found' }
            });
        });
    });

    it('toasts any other failure and stays on the page', () => {
        return mountWithAdminRead(apiRefusal(500, 'boom')).then(() => {
            expect(replace).not.toHaveBeenCalled();
            expect(addMessageMock).toHaveBeenCalledWith('boom');
        });
    });
});
