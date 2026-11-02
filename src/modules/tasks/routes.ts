/**
 * @module
 * Route table for the tasks module: the public contact form and the
 * staff inbox that reads what lands in it and the page for one task.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the tasks module, mounted under the app's module registry.
 */
export default [
    {
        // Public deliberately: a contact form exists for the visitor who cannot log in.
        path: 'contact',
        name: 'Contact',
        meta: { title: 'contact-page.page-title' },
        component: () => import('./views/Contact.vue')
    },
    {
        path: 'tasks',
        name: 'TaskInbox',
        meta: {
            access: 'auth',
            can: ['read', 'Task'],
            title: 'task-inbox-page.page-title'
        },
        component: () => import('./views/TaskInbox.vue')
    },
    {
        path: 'tasks/:id',
        name: 'TaskDetail',
        meta: {
            access: 'auth',
            can: ['read', 'Task'],
            title: 'task-detail-page.page-title'
        },
        component: () => import('./views/TaskDetail.vue')
    }
] satisfies RouteRecordRaw[];
