/**
 * @module
 * The record-route registry: answers a registered link type and nothing else, and a re-install
 * replaces the list instead of adding to it.
 */
import { describe, expect, it } from 'vitest';
import {
    auditTargetRouteOf,
    eventTargetRouteOf,
    recordRouteOf,
    registerAuditTargets,
    registerEventTargets,
    registerRecordRoutes
} from '@/kernel/record-routes.ts';

describe('the record-route registry', () => {
    it('answers a registered link type and nothing else, prototype names included', () => {
        registerRecordRoutes({ user: 'UserTarget' });

        expect(recordRouteOf('user')).toBe('UserTarget');
        expect(recordRouteOf('unheard-of')).toBeUndefined();
        expect(recordRouteOf('toString')).toBeUndefined();
    });

    it('replaces the previous list when installed again', () => {
        registerRecordRoutes({ user: 'UserTarget' });
        registerRecordRoutes({ thing: 'ThingTarget' });

        expect(recordRouteOf('user')).toBeUndefined();
        expect(recordRouteOf('thing')).toBe('ThingTarget');
    });
});

describe('the audit-target registry', () => {
    it('answers a registered type and nothing else, prototype names included', () => {
        registerAuditTargets({ order: 'OrderTarget' });

        expect(auditTargetRouteOf('order')).toBe('OrderTarget');
        expect(auditTargetRouteOf('api_key')).toBeUndefined();
        expect(auditTargetRouteOf('toString')).toBeUndefined();
    });

    it('replaces the previous list when installed again', () => {
        registerAuditTargets({ order: 'OrderTarget' });
        registerAuditTargets({});

        expect(auditTargetRouteOf('order')).toBeUndefined();
    });
});

describe('the event-target registry', () => {
    it('answers by family, and an exact event name wins over its family', () => {
        registerEventTargets({ user: 'UserTarget', 'user.erased': false });

        expect(eventTargetRouteOf('user.registered')).toBe('UserTarget');
        expect(eventTargetRouteOf('user.erased')).toBeUndefined();
    });

    it('answers nothing for an undeclared family, prototype names included', () => {
        registerEventTargets({ user: 'UserTarget' });

        expect(eventTargetRouteOf('unknown.thing')).toBeUndefined();
        expect(eventTargetRouteOf('constructor.x')).toBeUndefined();
    });

    it('replaces the previous list when installed again', () => {
        registerEventTargets({ user: 'UserTarget' });
        registerEventTargets({});

        expect(eventTargetRouteOf('user.registered')).toBeUndefined();
    });
});
