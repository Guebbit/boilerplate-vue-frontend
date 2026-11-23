/**
 * @module
 * The staff pages the `example` module declares for the records it owns, read the way the audit log
 * and the notification bell read them: through the registry, with only this module installed.
 */
import { describe, expect, it } from 'vitest';
import { collectModuleEventTargets } from '@/kernel/registry.ts';
import { eventTargetRouteOf, registerEventTargets } from '@/kernel/record-routes.ts';
import appModule from '../module.ts';

describe('the event targets example declares', () => {
    it.each([['example.created', 'ExampleTarget']])(
        'opens the page of the record %s was about',
        (eventName, route) => {
            registerEventTargets(collectModuleEventTargets([appModule]));

            expect(eventTargetRouteOf(eventName)).toBe(route);
        }
    );
});
