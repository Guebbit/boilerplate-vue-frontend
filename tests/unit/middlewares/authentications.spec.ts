import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const refreshTokenMock = vi.fn(() => Promise.resolve());
const fetchProfileMock = vi.fn(() => Promise.resolve());
const addMessageMock = vi.fn();
const profileRefs = {
    isAuth: ref(false),
    isAdmin: ref(false)
};

vi.mock('@/stores/profile', () => ({
    useProfileStore: () => ({
        refreshToken: refreshTokenMock,
        fetchProfile: fetchProfileMock
    })
}));

vi.mock('pinia', () => ({
    storeToRefs: () => profileRefs
}));

vi.mock('@guebbit/vue-toolkit', () => ({
    useNotificationsStore: () => ({
        addMessage: addMessageMock
    })
}));

vi.mock('@/utils/helperGenerics.ts', () => ({
    getCookie: vi.fn(() => {})
}));

vi.mock('@/utils/i18n.ts', () => ({
    i18n: {
        global: {
            t: (key: string) => key
        }
    }
}));

describe('authentications middleware', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        profileRefs.isAuth.value = false;
        profileRefs.isAdmin.value = false;
    });

    it('redirects guest to login for auth-only route', async () => {
        const { isAuth } = await import('@/middlewares/authentications');

        const result = await isAuth(
            { fullPath: '/en/admin', params: { locale: 'en' } } as never,
            {} as never
        );

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-not-logged');
        expect(result).toEqual(
            expect.objectContaining({ name: 'Login', params: { locale: 'en' } })
        );
    });

    it('redirects authenticated user away from guest-only route', async () => {
        const { isGuest } = await import('@/middlewares/authentications');
        profileRefs.isAuth.value = true;

        const result = await isGuest(
            { fullPath: '/en/login', params: { locale: 'en' } } as never,
            {} as never
        );

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-already-logged');
        expect(result).toEqual({ name: 'Home', params: { locale: 'en' } });
    });

    it('blocks non-admin on admin middleware', async () => {
        const { isAdmin } = await import('@/middlewares/authentications');
        profileRefs.isAuth.value = true;
        profileRefs.isAdmin.value = false;

        const result = await isAdmin(
            { fullPath: '/en/admin', params: { locale: 'en' } } as never,
            {} as never
        );

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-forbidden');
        expect(result).toEqual({ name: 'Home', params: { locale: 'en' } });
    });
});
