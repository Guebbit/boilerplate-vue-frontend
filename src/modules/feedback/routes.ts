import type { RouteRecordRaw } from 'vue-router';

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
