/**
 * @module
 * The staff pages the `products` module declares for the records it owns, read the way the audit log
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

describe('the audit targets products declares', () => {
    it.each([['product', 'ProductTarget']])('names the page of a %s', (type, route) => {
        registerAuditTargets(collectModuleAuditTargets([appModule]));

        expect(auditTargetRouteOf(type)).toBe(route);
    });
});

describe('the event targets products declares', () => {
    it.each([['product.updated', 'ProductTarget']])(
        'opens the page of the record %s was about',
        (eventName, route) => {
            registerEventTargets(collectModuleEventTargets([appModule]));

            expect(eventTargetRouteOf(eventName)).toBe(route);
        }
    );

    it('opens nothing for product.deleted: the record is gone', () => {
        registerEventTargets(collectModuleEventTargets([appModule]));

        expect(eventTargetRouteOf('product.deleted')).toBeUndefined();
    });
});
