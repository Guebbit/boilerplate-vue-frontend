/**
 * The access requirement every feedback route declares — same reasoning as the account module's
 * twin: a route that quietly loses its `meta.access` keeps rendering and is simply open. Here
 * the split IS the module: the contact form is deliberately public, the inbox deliberately not.
 */
import { describe, expect, it } from 'vitest';
import routes from '../routes';

describe('feedback route access', () => {
    it.each([
        ['Contact', undefined],
        ['FeedbackInbox', 'admin']
    ])('%s declares access: %s', (name, access) => {
        const route = routes.find((record) => record.name === name);
        expect(route).toBeDefined();
        expect(route?.meta?.access).toBe(access);
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            ['Contact', 'FeedbackInbox'].toSorted()
        );
    });
});
