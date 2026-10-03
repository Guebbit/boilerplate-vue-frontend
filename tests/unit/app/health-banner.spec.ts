/**
 * `AppHealthBanner` — the one banner this suite never mounted at all: hidden while the API
 * answers, shown the moment `useLivenessProbe` reports it down, and gone again once it recovers.
 *
 * `useLivenessProbe` (`@guebbit/vue-toolkit`) is mocked rather than driven through a real
 * `getHealth()` call: what this component owns is the `down` -> banner wiring, not the toolkit's
 * own retry loop, which is that package's test suite to cover.
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { VApp } from 'vuetify/components';
import AppHealthBanner from '@/app/components/AppHealthBanner.vue';
import vuetify from '@/ui/vuetify';

/**
 * `VSystemBar` (Vuetify) injects its layout position from an ancestor `VApp`/`VLayout` and throws
 * without one. `createVuetify()` here registers no components globally — this app relies on
 * `vite-plugin-vuetify`'s per-SFC auto-import instead — so `VApp` is imported and registered
 * explicitly rather than written as a bare `<v-app>` tag this inline template cannot resolve.
 */
const AppHealthBannerInLayout = defineComponent({
    components: { VApp, AppHealthBanner },
    template: '<v-app><app-health-banner /></v-app>'
});

/** Whether the mocked liveness probe reports the API down. */
const down = ref(false);

vi.mock('@guebbit/vue-toolkit', () => ({
    useLivenessProbe: () => ({ down, check: vi.fn(), stop: vi.fn() })
}));

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return { ...actual, useI18n: () => ({ t: (key: string) => key }) };
});

/** Mounts the banner with Vuetify. */
const mountBanner = () => mount(AppHealthBannerInLayout, { global: { plugins: [vuetify] } });

describe('AppHealthBanner', () => {
    it('renders nothing while the API answers', () => {
        down.value = false;

        expect(mountBanner().find('[data-test="health-banner"]').exists()).toBe(false);
    });

    it('shows the banner once the probe reports the API unreachable', () => {
        down.value = true;

        const banner = mountBanner();
        expect(banner.find('[data-test="health-banner"]').exists()).toBe(true);
        expect(banner.text()).toContain('generic.api-unreachable');
    });

    it('hides the banner again once the probe recovers', () =>
        Promise.resolve().then(() => {
            down.value = true;
            const banner = mountBanner();

            down.value = false;
            return banner.vm.$nextTick().then(() => {
                expect(banner.find('[data-test="health-banner"]').exists()).toBe(false);
            });
        }));

    /**
     * The `aria-live` region itself stays mounted whichever way `down` goes — only its content
     * comes and goes. See the component's own docblock for why: a region created together with
     * its message is never announced by assistive technology.
     */
    it('keeps the live region mounted even while nothing is wrong', () => {
        down.value = false;

        const region = mountBanner().find('[role="status"]');
        expect(region.exists()).toBe(true);
        expect(region.attributes('aria-live')).toBe('polite');
    });
});
