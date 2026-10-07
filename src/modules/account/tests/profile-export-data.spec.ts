/**
 * @module
 * Mounts the profile's export button: a click asks for the export and says a link is on its way,
 * and never downloads anything itself; a refusal blocks in place. `requestAccountExport` is
 * spied at the profile store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ProfileExportData from '../components/ProfileExportData.vue';
import { useProfileStore } from '../stores/profile.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

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

/** Press the button and let the request settle. */
const press = (wrapper: ReturnType<typeof mountComponent>['wrapper']) =>
    wrapper.get('[data-test=profile-export-data] button').trigger('click').then(flushPromises);

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ProfileExportData', () => {
    it('says nothing until it is pressed', () => {
        const { wrapper, request } = mountComponent();

        expect(request).not.toHaveBeenCalled();
        expect(wrapper.find('[data-test=profile-export-data-requested]').exists()).toBe(false);
    });

    it('asks for the export, and says a link will be mailed', () => {
        const { wrapper, request } = mountComponent();
        request.mockResolvedValue({ id: 'e1', status: 'building' });

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
        request.mockRejectedValue({
            success: false,
            status: 500,
            message: 'Internal Server Error',
            errors: [{ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }]
        });

        return press(wrapper).then(() => {
            expect(wrapper.get('[data-test=profile-export-data-error]').text()).toContain(
                'Something went wrong.'
            );
            expect(wrapper.find('[data-test=profile-export-data-requested]').exists()).toBe(false);
        });
    });

    it('forgets an earlier success when it is pressed again and the second try fails', () => {
        const { wrapper, request } = mountComponent();
        request.mockResolvedValueOnce({ id: 'e1', status: 'building' }).mockRejectedValueOnce({
            success: false,
            status: 500,
            message: 'Internal Server Error',
            errors: [{ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }]
        });

        return press(wrapper)
            .then(() => press(wrapper))
            .then(() => {
                expect(wrapper.find('[data-test=profile-export-data-requested]').exists()).toBe(
                    false
                );
            });
    });
});
