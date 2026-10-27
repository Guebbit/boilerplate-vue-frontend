/**
 * @module
 * Mounts the profile's export card: it reads the export's status on load (over the shared MSW
 * server), a click asks for the export and says a link is on its way, and it never downloads
 * anything itself; a refusal blocks in place. `requestAccountExport` is spied at the profile store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { http, HttpResponse } from 'msw';
import ProfileExportData from '../components/ProfileExportData.vue';
import { useProfileStore } from '../stores/profile.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { server } from '../../../../tests/support/unit/msw-server.ts';
import { aProblem } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/**
 * Mounts the component with the store call spied BEFORE mount — it destructures it at setup.
 *
 * @returns The wrapper and the spy each case configures.
 */
const mountComponent = () => {
    const request = vi.spyOn(useProfileStore(), 'requestAccountExport');
    const wrapper = mount(ProfileExportData, { global: { plugins: [vuetify, i18n] } });
    return { wrapper, request };
};

/** The export as the API describes it. */
const EXPORT = {
    id: 'e1',
    createdAt: '2026-09-07T10:00:00.000Z',
    actions: { download: false, request: true }
};

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

/** Press the button and let the request settle. */
const press = (wrapper: ReturnType<typeof mountComponent>['wrapper']) =>
    wrapper.get('[data-test=profile-export-data] button').trigger('click').then(flushPromises);

beforeEach(() => {
    setActivePinia(createPinia());
    statusIs();
    return loadLocale('en');
});

describe('ProfileExportData', () => {
    it('says nothing until it is pressed, when the account has no export', () => {
        const { wrapper, request } = mountComponent();

        return flushPromises().then(() => {
            expect(request).not.toHaveBeenCalled();
            expect(wrapper.find('[data-test=profile-export-data-requested]').exists()).toBe(false);
            expect(wrapper.find('[data-test=profile-export-data-ready]').exists()).toBe(false);
            expect(wrapper.find('[data-test=profile-export-data-failed]').exists()).toBe(false);
        });
    });

    it('says an export is being built when one is, even after a reload', () => {
        statusIs({ ...EXPORT, status: 'building' });
        const { wrapper } = mountComponent();

        return flushPromises().then(() => {
            expect(wrapper.get('[data-test=profile-export-data-requested]').text()).toContain(
                'preparing'
            );
        });
    });

    it('says until when a ready export is kept', () => {
        statusIs({ ...EXPORT, status: 'ready', expiresAt: '2026-09-14T10:00:00.000Z' });
        const { wrapper } = mountComponent();

        return flushPromises().then(() => {
            expect(wrapper.get('[data-test=profile-export-data-ready]').text()).toContain(
                'ready until'
            );
        });
    });

    it('says the last export failed, and that pressing the button asks again', () => {
        statusIs({ ...EXPORT, status: 'failed' });
        const { wrapper } = mountComponent();

        return flushPromises().then(() => {
            expect(wrapper.get('[data-test=profile-export-data-failed]').text()).toContain(
                'failed'
            );
        });
    });

    it('asks for the export, and says a link will be mailed', () => {
        const { wrapper, request } = mountComponent();
        request.mockResolvedValue({ ...EXPORT, status: 'building' } as never);

        return press(wrapper).then(() => {
            expect(request).toHaveBeenCalledOnce();
            expect(wrapper.get('[data-test=profile-export-data-requested]').text()).toContain(
                'email you a link'
            );
            expect(wrapper.find('[data-test=profile-export-data-error]').exists()).toBe(false);
        });
    });

    it('blocks in place when the request is refused, and claims no link is coming', () => {
        const { wrapper, request } = mountComponent();
        request.mockRejectedValue(
            aProblem(500, [{ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }])
        );

        return press(wrapper).then(() => {
            expect(wrapper.get('[data-test=profile-export-data-error]').text()).toContain(
                'Something went wrong.'
            );
            expect(wrapper.find('[data-test=profile-export-data-requested]').exists()).toBe(false);
        });
    });

    it('keeps saying where the export stands when asking again is refused', () => {
        const { wrapper, request } = mountComponent();
        request
            .mockResolvedValueOnce({ ...EXPORT, status: 'building' } as never)
            .mockRejectedValueOnce(
                aProblem(500, [{ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }])
            );

        return press(wrapper)
            .then(() => press(wrapper))
            .then(() => {
                expect(wrapper.get('[data-test=profile-export-data-error]').text()).toContain(
                    'Something went wrong.'
                );
                expect(wrapper.find('[data-test=profile-export-data-requested]').exists()).toBe(
                    true
                );
            });
    });
});
