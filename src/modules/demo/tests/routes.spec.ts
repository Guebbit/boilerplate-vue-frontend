/**
 * The demo module's route surface.
 *
 * Public and guarded by `exampleGuard` — both are the point of the module, so both are asserted:
 * a Playground that quietly lost its guard would still render, and the teaching case would be
 * silently gone.
 */
import { describe, expect, it } from 'vitest';
import routes from '../routes';
import { exampleGuard } from '../guards';

describe('demo routes', () => {
    it('serves the Playground publicly', () => {
        const route = routes.find((record) => record.name === 'Playground');
        expect(route).toBeDefined();
        expect(route?.meta?.access).toBeUndefined();
    });

    it('runs the demo guard on the Playground route only', () => {
        expect(routes.find((record) => record.name === 'Playground')?.beforeEnter).toEqual([
            exampleGuard
        ]);
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name)).toEqual(['Playground']);
    });
});
