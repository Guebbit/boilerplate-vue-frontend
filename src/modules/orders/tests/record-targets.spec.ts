/**
 * @module
 * The staff pages the `orders` module declares for the records it owns, read the way the audit log
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

describe('the audit targets orders declares', () => {
    it.each([['order', 'OrderTarget']])('names the page of a %s', (type, route) => {
        registerAuditTargets(collectModuleAuditTargets([appModule]));

        expect(auditTargetRouteOf(type)).toBe(route);
    });
});

describe('the event targets orders declares', () => {
    it.each([
        ['order.paid', 'OrderTarget'],
        ['payment.settled', 'OrderTarget'],
        ['return.approved', 'OrderTarget'],
        ['shipment.lost', 'OrderTarget'],
        ['fulfillment_order.held', 'OrderTarget'],
        ['inventory.reserved', 'OrderTarget']
    ])('opens the page of the record %s was about', (eventName, route) => {
        registerEventTargets(collectModuleEventTargets([appModule]));

        expect(eventTargetRouteOf(eventName)).toBe(route);
    });
});
