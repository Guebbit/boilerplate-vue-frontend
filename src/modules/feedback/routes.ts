/**
 * @module
 * Route table for the feedback module: the public contact form and the
 * admin-only inbox that reads what lands in it.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the feedback module, mounted under the app's module registry.
 */
export default [
    {
        // Public deliberately: a contact form exists for the visitor who cannot log in.
        path: 'contact',
        name: 'Contact',
        meta: { title: 'contact-page.page-title' },
        component: () => import('@/modules/feedback/views/Contact.vue')
    },
    {
        path: 'feedback',
        name: 'FeedbackInbox',
        meta: { access: 'admin', title: 'feedback-inbox-page.page-title' },
        component: () => import('@/modules/feedback/views/FeedbackInbox.vue')
    }
] as RouteRecordRaw[];
