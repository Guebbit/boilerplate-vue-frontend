/**
 * @module
 * The route table: each record pairs a path with its lazy-loaded view and the rule the router
 * checks. Each screen names the action it performs, so reading the list is not the same
 * permission as creating an example. One route is public and carries no `meta.access`; a
 * teaching guard runs on the edit route only.
 */
import type { RouteRecordRaw } from 'vue-router';
import { exampleEditGuard } from './guards.ts';

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
        component: () => import('@/modules/example/views/ExamplesList.vue')
    },
    {
        path: 'examples/create',
        name: 'ExampleCreate',
        meta: {
            access: 'auth',
            can: ['create', 'Example'],
            title: 'example-create-page.page-title'
        },
        component: () => import('@/modules/example/views/ExampleCreate.vue')
    },
    {
        // Public: anyone may read a published example, signed in or not.
        path: 'examples/published/:id',
        name: 'ExamplePublished',
        meta: { title: 'example-published-page.page-title' },
        component: () => import('@/modules/example/views/ExamplePublished.vue'),
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
        component: () => import('@/modules/example/views/ExampleTarget.vue'),
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
        // Scoped to this route rather than registered app-wide: a teaching guard has no business
        // running on every navigation.
        beforeEnter: [exampleEditGuard],
        component: () => import('@/modules/example/views/ExampleEdit.vue'),
        props: true
    }
] satisfies RouteRecordRaw[];
