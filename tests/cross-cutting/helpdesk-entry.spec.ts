/**
 * @module
 * The staff "Helpdesk" menu entry (tasks module) end to end: the real tasks manifest, the real registry and the
 * real router resolve the entry, and the real `canAccess` decides who sees it. `AppNavigation`
 * filters exactly this way (`router.resolve({ name }).meta` through `canAccess`), so what is
 * asserted here is what the menu renders.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { canAccess } from '@/app/guards/authentications';
import type { AppModule } from '@/kernel/registry';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
});

/**
 * The tasks module mounted in a real router, from a fresh load under the given helpdesk URL.
 *
 * @param url - the helpdesk URL the deployment sets, `''` for none.
 * @returns the router and the module's navigation entries.
 */
const mountTasks = async (url: string) => {
    vi.stubEnv('VITE_ZAMMAD_URL', url);
    vi.resetModules();
    const [{ default: tasks }, { collectModuleNavigation, collectModuleRoutes }] =
        await Promise.all([import('@/modules/tasks/module'), import('@/kernel/registry')]);
    const modules: AppModule[] = [tasks];
    const router = createRouter({
        history: createMemoryHistory(),
        // Module routes are relative: the app mounts them under its own shell route.
        routes: [
            { path: '/', component: { render: () => null }, children: collectModuleRoutes(modules) }
        ]
    });
    return { router, navigation: collectModuleNavigation(modules) };
};

/**
 * Names of the admin-menu entries a visitor sees, built from a fresh load of the tasks module.
 *
 * @param url - the helpdesk URL the deployment sets, `''` for none.
 * @param visitor - signed-in state and the `"action subject"` rules the session holds.
 * @returns the route names of the visible `admin` entries.
 */
const visibleAdminEntries = async (
    url: string,
    visitor: { isAuth: boolean; rules: string[] }
): Promise<string[]> => {
    const { router, navigation } = await mountTasks(url);
    return navigation
        .filter(({ section }) => section === 'admin')
        .filter(({ name }) =>
            canAccess(router.resolve({ name }).meta, {
                isAuth: visitor.isAuth,
                can: (action, subject) => visitor.rules.includes(`${action} ${subject}`)
            })
        )
        .map(({ name }) => name);
};

describe('the staff Helpdesk entry', () => {
    it('shows to staff who read tasks when the URL is set', async () => {
        expect(
            await visibleAdminEntries('https://help.example.com', {
                isAuth: true,
                rules: ['read Task']
            })
        ).toContain('Helpdesk');
    });

    it('does not show to a signed-in shopper without the tasks permission', async () => {
        expect(
            await visibleAdminEntries('https://help.example.com', {
                isAuth: true,
                rules: ['read Order']
            })
        ).not.toContain('Helpdesk');
    });

    it('does not show to a guest', async () => {
        expect(
            await visibleAdminEntries('https://help.example.com', { isAuth: false, rules: [] })
        ).not.toContain('Helpdesk');
    });

    it('does not exist for anyone when no URL is set', async () => {
        expect(await visibleAdminEntries('', { isAuth: true, rules: ['read Task'] })).not.toContain(
            'Helpdesk'
        );
    });

    it('leaves the app for the helpdesk when entered, and the current page does not change', async () => {
        const assign = vi.fn<(url: string) => void>();
        vi.stubGlobal('location', { assign });
        const { router } = await mountTasks('https://help.example.com');
        await router.push('/contact');

        await router.push({ name: 'Helpdesk' });

        expect(assign).toHaveBeenCalledWith('https://help.example.com');
        expect(router.currentRoute.value.path).toBe('/contact');
    });
});
