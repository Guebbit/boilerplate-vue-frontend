import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const refreshTokenMock = vi.fn();
const fetchProfileMock = vi.fn();
const addMessageMock = vi.fn();
const nextMock = vi.fn();
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

describe('authentications middleware', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        profileRefs.isAuth.value = false;
        profileRefs.isAdmin.value = false;
    });

    it('redirects guest to login for auth-only route', async () => {
        const { isAuth } = await import('../authentications');

        await isAuth(
            { fullPath: '/en/admin' } as never,
            {} as never,
            nextMock
        );

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-not-logged');
        expect(nextMock).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Login'
            })
        );
    });

    it('redirects authenticated user away from guest-only route', async () => {
        const { isGuest } = await import('../authentications');
        profileRefs.isAuth.value = true;

        await isGuest(
            {} as never,
            {} as never,
            nextMock
        );

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-already-logged');
        expect(nextMock).toHaveBeenCalledWith({ name: 'Home' });
    });

    it('blocks non-admin on admin middleware', async () => {
        const { isAdmin } = await import('../authentications');
        profileRefs.isAuth.value = true;
        profileRefs.isAdmin.value = false;

        await isAdmin(
            { fullPath: '/en/admin' } as never,
            {} as never,
            nextMock
        );

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-forbidden');
        expect(nextMock).toHaveBeenCalledWith({ name: 'Home' });
    });
});
