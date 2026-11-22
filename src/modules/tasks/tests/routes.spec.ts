/**
 * @module
 * Pins the `meta.access` every tasks route declares, against a hard-coded table — same
 * reasoning as the account module's twin: a route that quietly loses its `meta.access` keeps
 * rendering and is simply open. Here the split IS the module: the contact form is deliberately
 * public, the inbox deliberately not.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import routes from '../routes';

describe('tasks route access', () => {
    it.each([
        ['Contact', undefined, undefined, undefined],
        ['TaskInbox', 'auth', 'read', 'Task'],
        ['TaskDetail', 'auth', 'read', 'Task']
    ])('%s declares access %s, permission %s %s', (name, access, action, subject) => {
        const route = routes.find((record) => record.name === name);
        expect(route).toBeDefined();
        expect(route?.meta?.access).toBe(access);
        expect(route?.meta?.can).toEqual(action ? [action, subject] : undefined);
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            ['Contact', 'TaskInbox', 'TaskDetail'].toSorted()
        );
    });
});

/**
 * Loads the route table fresh, because the helpdesk URL is read once when the module loads.
 *
 * @param url - the helpdesk URL the deployment sets, `''` for none.
 * @returns the `Helpdesk` record, `undefined` when the table has none.
 */
const loadHelpdeskRoute = (url: string) => {
    vi.stubEnv('VITE_ZAMMAD_URL', url);
    vi.resetModules();
    return import('../routes').then((module) =>
        module.default.find(({ name }) => name === 'Helpdesk')
    );
};

describe('tasks helpdesk route', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('is absent when the deployment has no helpdesk URL', async () => {
        expect(await loadHelpdeskRoute('')).toBeUndefined();
    });

    it('is present, for staff who read tasks, when the URL is set', async () => {
        const route = await loadHelpdeskRoute('https://help.example.com');

        expect(route?.meta?.access).toBe('auth');
        expect(route?.meta?.can).toEqual(['read', 'Task']);
    });
});
