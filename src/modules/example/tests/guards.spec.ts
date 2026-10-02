/**
 * @module
 * The edit route's teaching guard. Three of its properties are real Vue Router concerns rather
 * than demo details:
 *
 *   1. It must resolve to `undefined`. Vue Router treats ANY returned value as a navigation
 *      instruction: `false` would block every edit, an object would redirect.
 *   2. It must survive a failed load. The view shows its own not-found page, so the guard never
 *      holds a navigation hostage to a network error.
 *   3. It loads through a real Pinia store, because the lesson is that a store IS reachable here.
 *
 * `logger` is silenced: the guard logs on every navigation by design.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { RouteLocationNormalized } from 'vue-router';
import { asStub } from '../../../../tests/support/stub';

const fetchExample = vi.fn<(id: string) => Promise<unknown>>();

vi.mock('@/modules/example/store.ts', () => ({
    useExampleStore: () => ({ fetchExample })
}));

vi.mock('@/infrastructure/utils/logger.ts', () => ({
    logger: { debug: vi.fn() }
}));

const { exampleEditGuard } = await import('@/modules/example/guards.ts');

/**
 * A minimal route stub carrying just the field the guard reads.
 *
 * @param parameters - The route's params.
 */
const routeTo = (parameters: Record<string, unknown>) =>
    asStub<RouteLocationNormalized>({
        path: '/en/examples/x/edit',
        name: 'ExampleEdit',
        params: parameters
    });

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    fetchExample.mockResolvedValue(undefined);
});

describe('exampleEditGuard', () => {
    it('loads the example the route names before the screen mounts', () =>
        exampleEditGuard(routeTo({ id: 'abc' })).then(() => {
            expect(fetchExample).toHaveBeenCalledWith('abc');
        }));

    it('lets the navigation through by resolving to undefined', () =>
        expect(exampleEditGuard(routeTo({ id: 'abc' }))).resolves.toBeUndefined());

    it('survives a failed load, leaving the not-found page to the view', () => {
        fetchExample.mockRejectedValue(new Error('network down'));

        return expect(exampleEditGuard(routeTo({ id: 'abc' }))).resolves.toBeUndefined();
    });

    it('loads nothing when the route carries no id', () =>
        exampleEditGuard(routeTo({})).then(() => {
            expect(fetchExample).not.toHaveBeenCalled();
        }));

    it('loads nothing for an id that arrived as a list', () =>
        exampleEditGuard(routeTo({ id: ['a', 'b'] })).then(() => {
            expect(fetchExample).not.toHaveBeenCalled();
        }));
});
