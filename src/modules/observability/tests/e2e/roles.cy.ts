/**
 * @module
 * Who may open the platform pages and the audit trail: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('observability', [
    {
        name: 'administration',
        route: '/en/admin',
        can: ['read', 'ObservabilitySnapshot'],
        menuHref: '/en/admin',
        pageRoot: '#admin-page'
    },
    {
        name: 'realtime',
        route: '/en/playground/realtime',
        can: ['read', 'ObservabilitySnapshot'],
        menuHref: '/en/playground/realtime',
        pageRoot: '#realtime-playground-page'
    },
    {
        name: 'audit trail',
        route: '/en/audit',
        can: ['read', 'AuditLog'],
        menuHref: '/en/audit',
        pageRoot: '#audit-log-page'
    }
]);
