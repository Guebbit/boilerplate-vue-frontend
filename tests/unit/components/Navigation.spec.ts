import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, defineComponent, h } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { VLayout } from 'vuetify/components';
import AppNavigation from '@/components/organisms/AppNavigation.vue';

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return {
        ...actual,
        useI18n: () => ({
            t: (key: string) => key
        })
    };
});

vi.mock('@/stores/profile.ts', () => ({
    useProfileStore: () => ({
        isAuth: ref(false),
        isAdmin: ref(false)
    })
}));

/*
 * Minimal stub page for every named route used by the navigation.
 */
const stubPage = { template: '<div />' };

/*
 * Minimal router: VBtn "to" props need a real vue-router instance
 * that can resolve the named routes used by AppNavigation.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        'Home',
        'Playground',
        'Admin',
        'UsersList',
        'ProductsList',
        'Profile',
        'Cart',
        'OrdersList',
        'Signup',
        'Logout'
    ].map((name) => ({
        path: `/:locale?/${name.toLowerCase()}`,
        name,
        component: stubPage
    }))
});

/*
 * VAppBar requires a Vuetify layout: wrap the navigation in VLayout.
 */
const navigationHarness = defineComponent({
    render: () => h(VLayout, () => [h(AppNavigation)])
});

describe('Navigation', () => {
    it('renders properly', () =>
        expect(mount(navigationHarness, { global: { plugins: [router] } })).toBeTruthy());
});
