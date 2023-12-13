import { createRouter, createWebHistory } from 'vue-router';
import errorRoutes from "./errorRoutes";
import userRoutes from "./userRoutes";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import HomeView from '@/views/Home.vue';
import authenticationCheck from "./authenticationCheck";


const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_APP_BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      meta: {
        layout: DefaultLayout,
      },
      component: HomeView
    },
    {
      path: '/restricted',
      name: 'Restricted',
      meta: {
        layout: DefaultLayout,
      },
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('@/views/Restricted.vue'),
      beforeEnter: [authenticationCheck],
    },
    ...userRoutes,
    ...errorRoutes,
    /**
     * Catch all route for all wrong routes
     */
    {
      path: '/:catchAll(.*)',
      redirect: {
        name: '404'
      }
    }
  ]
})

export default router;
