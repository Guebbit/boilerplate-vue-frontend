/**
 * `AppStaffEnrollmentBanner` — it keys on the server's `secondFactorRequired`, not on a role name:
 * a staff role that already holds an app shows nothing, and a guest never sees it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia } from 'pinia';
import AppStaffEnrollmentBanner from '@/app/components/AppStaffEnrollmentBanner.vue';
import vuetify from '@/ui/vuetify';

/** The mocked session store: a viewer (or none) and the flag the abilities answer published. */
const session = {
    viewer: ref<{ email: string; role?: string } | undefined>(undefined),
    secondFactorRequired: ref(false)
};

vi.mock('@/infrastructure/session.ts', () => ({ useSessionStore: () => session }));

vi.mock('vue-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-router')>();
    return { ...actual, RouterLink: { template: '<a><slot /></a>' } };
});

vi.mock('@/i18n/router-link.ts', () => ({ routerLinkI18n: (to: unknown) => to }));

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return { ...actual, useI18n: () => ({ t: (key: string) => key }) };
});

/** Mounts the banner with a real Pinia and Vuetify. */
const mountBanner = () =>
    mount(AppStaffEnrollmentBanner, { global: { plugins: [createPinia(), vuetify] } });

describe('AppStaffEnrollmentBanner', () => {
    beforeEach(() => {
        session.viewer.value = undefined;
        session.secondFactorRequired.value = false;
    });

    it('shows nothing to a guest, even if a flag lingers', () => {
        session.secondFactorRequired.value = true;

        expect(mountBanner().find('[data-test="staff-enrollment-banner"]').exists()).toBe(false);
    });

    it('shows nothing to a signed-in visitor whose role is already switched on', () => {
        session.viewer.value = { email: 'ada@example.com', role: 'manager' };

        expect(mountBanner().find('[data-test="staff-enrollment-banner"]').exists()).toBe(false);
    });

    it('asks a staff member whose role is waiting for an app to set one up', () => {
        session.viewer.value = { email: 'ada@example.com', role: 'manager' };
        session.secondFactorRequired.value = true;

        const banner = mountBanner();

        expect(banner.find('[data-test="staff-enrollment-banner"]').exists()).toBe(true);
        expect(banner.find('[data-test="staff-enrollment-go"]').exists()).toBe(true);
    });
});
