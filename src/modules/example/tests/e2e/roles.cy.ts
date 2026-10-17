/**
 * @module
 * Who may open the example pages: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('example', [
    {
        name: 'examples list',
        route: '/en/examples',
        can: ['read', 'Example'],
        pageRoot: '#examples-list-page',
        buttons: [{ selector: '[data-test=example-create]', can: ['create', 'Example'] }]
    },
    {
        name: 'example create',
        route: '/en/examples/create',
        can: ['create', 'Example'],
        pageRoot: '#example-create-page'
    }
]);
