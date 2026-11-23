/**
 * @module
 * The record-route registry: answers a registered link type and nothing else, and a re-install
 * replaces the list instead of adding to it.
 */
import { describe, expect, it } from 'vitest';
import { recordRouteOf, registerRecordRoutes } from '@/kernel/record-routes.ts';

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
