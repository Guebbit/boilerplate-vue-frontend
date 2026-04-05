import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import Navigation from '@/components/organisms/Navigation.vue';

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return {
        ...actual,
        useI18n: () => ({
            t: (key: string) => key
        })
    };
});

vi.mock('vue-router', () => ({
    RouterLink: {
        template: '<a><slot /></a>'
    },
    useRoute: () => ({ fullPath: '/' }),
    useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/stores/profile.ts', () => ({
    useProfileStore: () => ({
        isAuth: ref(false),
        isAdmin: ref(false)
    })
}));

describe('Navigation', () => {
    it('renders properly', () => expect(mount(Navigation)).toBeTruthy());
});
