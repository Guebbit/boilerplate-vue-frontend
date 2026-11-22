/**
 * @module
 * Route table for the tasks module: the public contact form and the
 * staff inbox that reads what lands in it, the page for one task, and, only when the deployment
 * sets a helpdesk URL, the staff door out to that helpdesk.
 */
import type { RouteRecordRaw } from 'vue-router';
import { readZammadUrl } from '@/infrastructure/runtime-config.ts';

/**
 * The helpdesk's public URL, read once when the module loads. `config.js` is in place before the
 * bundle runs, so a container restart is what changes it.
 */
export const helpdeskUrl = readZammadUrl();

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
            title: 'tasks-page.page-title'
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
    },
    // Present only when the deployment has a helpdesk: no URL, no route, no menu entry.
    ...(helpdeskUrl
        ? [
              {
                  path: 'helpdesk',
                  name: 'Helpdesk',
                  meta: {
                      access: 'auth',
                      can: ['read', 'Task'],
                      title: 'navigation.label-helpdesk'
                  },
                  // Routeless, like `Logout`: entering the route leaves the app for the helpdesk.
                  component: {
                      /**
                       * Sends the browser to the helpdesk and cancels the in-app navigation.
                       *
                       * @returns `false`, so the router never renders anything here.
                       */
                      beforeRouteEnter: () => {
                          location.assign(helpdeskUrl);
                          return false;
                      }
                  }
              } satisfies RouteRecordRaw
          ]
        : [])
] satisfies RouteRecordRaw[];
