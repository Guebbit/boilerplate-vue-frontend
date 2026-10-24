/**
 * @module
 * Mounts the real edit page against a real, memory-history router: the form opens filled from the
 * cached record, a save sends only what changed, a cover goes up as its own request after the JSON
 * save, and a refusal blocks the form in place. The store's calls are spied at the store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ExampleEdit from '../views/ExampleEdit.vue';
import { useExampleStore } from '../store';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { contractRequest } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import * as schemas from '@api/schemas';
import type { Example } from '@types';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** The record every case loads and edits. */
const EXAMPLE: Example = {
    id: 'ex-1',
    title: 'A title',
    body: 'A body',
    status: 'draft',
    userId: 'u-1',
    ownerName: 'ada',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

/**
 * Mounts the page for `ex-1`, seeding the store's cache by hand the way an earlier load
 * would have left it, and spying every call the page makes.
 *
 * @returns The wrapper and the spies each case reads.
 */
const mountPage = (record: Example = EXAMPLE) => {
    const store = useExampleStore();
    store.addExampleRecord({ ...record });
    vi.spyOn(store, 'watchExample').mockReturnValue(vi.fn() as never);
    const update = vi.spyOn(store, 'updateExample').mockResolvedValue(EXAMPLE);
    const cover = vi
        .spyOn(store, 'setCover')
        .mockResolvedValue({ ...EXAMPLE, imageUrl: '/images/a.png' });
    // The view selects the record by id; here the cache already holds it.
    store.selectedExampleId = EXAMPLE.id;

    const fetch = vi.spyOn(store, 'fetchExample').mockResolvedValue(record);
    const wrapper = mount(ExampleEdit, {
        props: { id: EXAMPLE.id },
        attachTo: document.body,
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
    return { wrapper, update, cover, fetch };
};

beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    return loadLocale('en').then(() =>
        router.push(`/en/examples/${EXAMPLE.id}/edit`).then(() => router.isReady())
    );
});

describe('ExampleEdit', () => {
    it('opens filled from the cached record', () => {
        const { wrapper } = mountPage();

        return flushPromises().then(() => {
            expect(
                wrapper.get<HTMLInputElement>('[data-test=example-title] input').element.value
            ).toBe('A title');
            expect(
                wrapper.get<HTMLTextAreaElement>('[data-test=example-body] textarea').element.value
            ).toBe('A body');
        });
    });

    it('sends only what changed, as a merge', () => {
        const { wrapper, update } = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=example-title] input').setValue('Renamed'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(update).toHaveBeenCalledTimes(1);
                expect(update.mock.calls[0][0]).toBe(EXAMPLE.id);
                expect(
                    contractRequest(schemas.UpdateExampleByIdBody, update.mock.calls[0][1])
                ).toEqual({
                    title: 'Renamed'
                });
            });
    });

    it('sends no cover request when no image was picked', () => {
        const { wrapper, cover } = mountPage();

        return flushPromises()
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(cover).not.toHaveBeenCalled();
            });
    });

    it('refuses an emptied title, and sends nothing', () => {
        const { wrapper, update } = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=example-title] input').setValue(''))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(update).not.toHaveBeenCalled();
                expect(wrapper.find('[data-test=example-title] .v-messages').text()).not.toBe('');
            });
    });

    it('blocks the form in place when the API refuses the save', () => {
        const { wrapper, update } = mountPage();
        update.mockRejectedValue({
            success: false,
            status: 500,
            message: 'Server error',
            errors: [{ code: 'INTERNAL', message: 'Server error' }]
        });

        return flushPromises()
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=example-edit-form-error]').exists()).toBe(true);
            });
    });

    it('has no status field: the status moves through its own buttons', () => {
        const { wrapper } = mountPage();

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=example-status]').exists()).toBe(false);
        });
    });

    it('renders the moves the server listed, and none it did not', () => {
        const { wrapper } = mountPage({
            ...EXAMPLE,
            actions: { transitions: ['published', 'archived'], update: true, delete: true }
        });

        return flushPromises().then(() => {
            expect(wrapper.findAll('[data-test^=example-move-]')).toHaveLength(2);
        });
    });

    it('says the record moved on a 412, offers to reload, and re-reads on request', () => {
        const { wrapper, update, fetch } = mountPage();
        update.mockRejectedValue({
            success: false,
            status: 412,
            message: 'Precondition failed',
            errors: [{ code: 'PRECONDITION_FAILED', message: 'Precondition failed' }]
        });

        return flushPromises()
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=example-edit-form-error]').exists()).toBe(true);
                return wrapper.get('[data-test=example-reload-latest]').trigger('click');
            })
            .then(flushPromises)
            .then(() => {
                expect(fetch).toHaveBeenCalledWith(EXAMPLE.id, { forced: true });
            });
    });

    it('disables the form and says why when the row says update is not allowed', () => {
        const { wrapper } = mountPage({
            ...EXAMPLE,
            actions: { transitions: [], update: false, delete: false }
        });

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=example-read-only]').exists()).toBe(true);
            expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined();
        });
    });
});
