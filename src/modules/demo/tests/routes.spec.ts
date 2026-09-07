/**
 * @module
 * The demo module's route surface: public and guarded by `exampleGuard` — both are the point of
 * the module, so both are asserted. A Playground that quietly lost its guard would still render,
 * and the teaching case would be silently gone.
 */
import { describe, expect, it } from 'vitest';
import routes from '../routes';
import { exampleGuard } from '../guards';

describe('demo routes', () => {
    it('serves the Playground publicly', () => {
        const route = routes.find((record) => record.name === 'Playground');
        expect(route).toBeDefined();
        // `not.toHaveProperty` rather than reading `.access`: the route table `satisfies`
        // `RouteRecordRaw[]`, so its `meta` keeps the literal type it declares and a key it
        // does not have is not readable. Absence is the assertion either way.
        expect(route?.meta).not.toHaveProperty('access');
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
