/**
 * `AppVerificationBanner` — B10: it keys on `viewer.verified`, not on a shop permission. A
 * platform-only operator holding no `Cart` subject at all must still see it while unverified, and
 * a verified customer must not see it just because they also hold `cart.self.checkout`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia } from 'pinia';
import AppVerificationBanner from '@/app/components/AppVerificationBanner.vue';
import vuetify from '@/ui/vuetify';

const session = {
    viewer: ref<{ email: string; verified: boolean } | undefined>(undefined)
};

const requestEmailVerification = vi.fn();

vi.mock('@/infrastructure/session.ts', () => ({
    useSessionStore: () => session
}));

vi.mock('@/modules/account/stores/profile.ts', () => ({
    useProfileStore: () => ({ requestEmailVerification })
}));

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return {
        ...actual,
        useI18n: () => ({
            t: (key: string, options?: { seconds: number }) =>
                `${key}${options ? `:${options.seconds}` : ''}`
        })
    };
});

const mountBanner = () =>
    mount(AppVerificationBanner, { global: { plugins: [createPinia(), vuetify] } });

describe('AppVerificationBanner', () => {
    beforeEach(() => {
        session.viewer.value = undefined;
        requestEmailVerification.mockReset();
    });

    it('shows no banner to a guest', () => {
        expect(mountBanner().find('[data-test="verify-banner"]').exists()).toBe(false);
    });

    it('shows the banner to an unverified visitor, whatever their shop permissions', () => {
        session.viewer.value = { email: 'ada@example.com', verified: false };

        expect(mountBanner().find('[data-test="verify-banner"]').exists()).toBe(true);
    });

    /**
     * The bug this reverses: the old `!can('checkout', 'Cart')` check hid the banner from any
     * platform-only operator, since a build with no shop module declares no `Cart` subject at all.
     */
    it('shows the banner to an unverified operator on a platform-only build', () => {
        session.viewer.value = { email: 'ops@example.com', verified: false };

        expect(mountBanner().find('[data-test="verify-banner"]').exists()).toBe(true);
    });

    it('hides the banner once the visitor is verified', () => {
        session.viewer.value = { email: 'ada@example.com', verified: true };

        expect(mountBanner().find('[data-test="verify-banner"]').exists()).toBe(false);
    });
});
