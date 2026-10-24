/**
 * @module
 * In any module: the route table pairs each path with its lazy-loaded view and the rule the router
 * checks. Each screen names the action it performs; the coarse `meta.can` lets a caller in, and the
 * record's own `actions` decide per row.
 * Here: one public route. Every view loads its own record, so no route guard fetches data.
 * See: docs/theory/modules.md#the-module-template
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the example module, mounted under the app's module registry. `create` is
 * declared before `:id` so the word cannot be read as an id.
 */
export default [
    {
        path: 'examples',
        name: 'ExamplesList',
        meta: {
            access: 'auth',
            can: ['read', 'Example'],
            title: 'examples-list-page.page-title'
        },
        component: () => import('./views/ExamplesList.vue')
    },
    {
        path: 'examples/create',
        name: 'ExampleCreate',
        meta: {
            access: 'auth',
            can: ['create', 'Example'],
            title: 'example-create-page.page-title'
        },
        component: () => import('./views/ExampleCreate.vue')
    },
    {
        // Public: anyone may read a published example, signed in or not.
        path: 'examples/published/:id',
        name: 'ExamplePublished',
        meta: { title: 'example-published-page.page-title' },
        component: () => import('./views/ExamplePublished.vue'),
        props: true
    },
    {
        path: 'examples/:id',
        name: 'ExampleTarget',
        meta: {
            access: 'auth',
            can: ['read', 'Example'],
            title: 'example-target-page.page-title'
        },
        component: () => import('./views/ExampleTarget.vue'),
        props: true
    },
    {
        path: 'examples/:id/edit',
        name: 'ExampleEdit',
        meta: {
            access: 'auth',
            can: ['update', 'Example'],
            title: 'example-edit-page.page-title'
        },
        component: () => import('./views/ExampleEdit.vue'),
        props: true
    }
] satisfies RouteRecordRaw[];
