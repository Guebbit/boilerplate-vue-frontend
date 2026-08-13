import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        // Public deliberately: a contact form exists for the visitor who cannot log in.
        path: 'contact',
        name: 'Contact',
        component: () => import('@/modules/feedback/views/Contact.vue')
    },
    {
        path: 'feedback',
        name: 'FeedbackInbox',
        meta: { access: 'admin' },
        component: () => import('@/modules/feedback/views/FeedbackInbox.vue')
    }
] as RouteRecordRaw[];
