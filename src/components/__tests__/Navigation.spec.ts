import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import Navigation from '../organisms/Navigation.vue';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key
    })
}));

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

/**
 *
 */
describe('Navigation', () => {
    it('renders properly', () => expect(mount(Navigation)).toBeTruthy());
});
