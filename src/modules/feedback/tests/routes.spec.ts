/**
 * @module
 * Pins the `meta.access` every feedback route declares, against a hard-coded table — same
 * reasoning as the account module's twin: a route that quietly loses its `meta.access` keeps
 * rendering and is simply open. Here the split IS the module: the contact form is deliberately
 * public, the inbox deliberately not.
 */
import { describe, expect, it } from 'vitest';
import routes from '../routes';

describe('feedback route access', () => {
    it.each([
        ['Contact', undefined, undefined, undefined],
        ['FeedbackInbox', 'auth', 'read', 'Feedback']
    ])('%s declares access %s, permission %s %s', (name, access, action, subject) => {
        const route = routes.find((record) => record.name === name);
        expect(route).toBeDefined();
        expect(route?.meta?.access).toBe(access);
        expect(route?.meta?.can).toEqual(action ? [action, subject] : undefined);
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            ['Contact', 'FeedbackInbox'].toSorted()
        );
    });
});
