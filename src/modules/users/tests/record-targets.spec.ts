/**
 * @module
 * The staff pages the `users` module declares for the records it owns, read the way the audit log
 * and the notification bell read them: through the registry, with only this module installed.
 */
import { describe, expect, it } from 'vitest';
import { collectModuleAuditTargets, collectModuleEventTargets } from '@/kernel/registry.ts';
import {
    auditTargetRouteOf,
    registerAuditTargets,
    eventTargetRouteOf,
    registerEventTargets
} from '@/kernel/record-routes.ts';
import appModule from '../module.ts';

describe('the audit targets users declares', () => {
    it.each([['user', 'UserTarget']])('names the page of a %s', (type, route) => {
        registerAuditTargets(collectModuleAuditTargets([appModule]));

        expect(auditTargetRouteOf(type)).toBe(route);
    });
});

describe('the event targets users declares', () => {
    it.each([['user.updated', 'UserTarget']])(
        'opens the page of the record %s was about',
        (eventName, route) => {
            registerEventTargets(collectModuleEventTargets([appModule]));

            expect(eventTargetRouteOf(eventName)).toBe(route);
        }
    );

    it('opens nothing for user.erased: the record is gone', () => {
        registerEventTargets(collectModuleEventTargets([appModule]));

        expect(eventTargetRouteOf('user.erased')).toBeUndefined();
    });
});
