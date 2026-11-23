/**
 * @module
 * The staff pages the `webhooks` module declares for the records it owns, read the way the audit log
 * and the notification bell read them: through the registry, with only this module installed.
 */
import { describe, expect, it } from 'vitest';
import { collectModuleAuditTargets } from '@/kernel/registry.ts';
import { auditTargetRouteOf, registerAuditTargets } from '@/kernel/record-routes.ts';
import appModule from '../module.ts';

describe('the audit targets webhooks declares', () => {
    it.each([['webhook_subscription', 'WebhookTarget']])(
        'names the page of a %s',
        (type, route) => {
            registerAuditTargets(collectModuleAuditTargets([appModule]));

            expect(auditTargetRouteOf(type)).toBe(route);
        }
    );
});
