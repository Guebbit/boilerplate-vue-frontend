/**
 * @module
 * Route table for the tickets module: the public contact form and the
 * staff inbox that reads what lands in it and the page for one ticket.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the tickets module, mounted under the app's module registry.
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
        path: 'tickets',
        name: 'TicketInbox',
        meta: {
            access: 'auth',
            can: ['read', 'Ticket'],
            title: 'ticket-inbox-page.page-title'
        },
        component: () => import('./views/TicketInbox.vue')
    },
    {
        path: 'tickets/:id',
        name: 'TicketDetail',
        meta: {
            access: 'auth',
            can: ['read', 'Ticket'],
            title: 'ticket-detail-page.page-title'
        },
        component: () => import('./views/TicketDetail.vue')
    }
] satisfies RouteRecordRaw[];
