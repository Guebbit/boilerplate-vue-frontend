import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia } from 'pinia';
import AppNavigation from '@/components/organisms/AppNavigation.vue';
import vuetify from '@/plugins/vuetify';

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return {
        ...actual,
        useI18n: () => ({
            t: (key: string) => key,
            locale: ref('en')
        })
    };
});

vi.mock('vue-router', () => ({
    RouterLink: {
        template: '<a><slot /></a>'
    },
    useRoute: () => ({ fullPath: '/', params: {}, query: {} }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

vi.mock('@/stores/profile.ts', () => ({
    useProfileStore: () => ({
        isAuth: ref(false),
        isAdmin: ref(false),
        profile: ref(undefined),
        updateProfileLanguage: vi.fn()
    })
}));

describe('Navigation', () => {
    it('renders properly', () =>
        expect(
            mount(AppNavigation, {
                global: {
                    plugins: [createPinia(), vuetify],
                    stubs: {
                        // v-app-bar teleports into a v-app layout that does not exist here
                        VAppBar: {
                            template:
                                '<header><slot name="prepend" /><slot /><slot name="append" /></header>'
                        },
                        VNavigationDrawer: { template: '<aside><slot /></aside>' }
                    }
                }
            })
        ).toBeTruthy());
});
