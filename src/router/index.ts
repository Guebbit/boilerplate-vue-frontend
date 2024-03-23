import { createRouter, createWebHistory, RouterView } from 'vue-router';
import userRoutes from "./userRoutes";
import demoMiddleware from "@/middlewares/demoMiddleware";
import localeChoice from "@/middlewares/localeChoice";
import authenticationCheck from "@/middlewares/authenticationCheck";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import ErrorPageLayout from '@/layouts/ErrorPageLayout.vue';
import HomeView from '@/views/Home.vue';


const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_APP_BASE_URL),
  routes: [
    {
      path: "/:locale?",
      component: RouterView,
      beforeEnter: [
          demoMiddleware,
          localeChoice
      ],
      children: [
        {
          path: '',
          name: 'Home',
          meta: {
            layout: DefaultLayout,
          },
          component: HomeView
        },
        {
          path: 'restricted',
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
        // TODO
        // {
        //   path: 'error',
        //   name: 'Error',
        //   meta: {
        //     layout: ErrorPageLayout,
        //   },
        //   component: () => import('@/views/Error.vue'),
        //   props: true
        // },
        ...userRoutes,
      ]
    },
    /**
     * Catch all route for all wrong routes
     */
    // TODO
    // {
    //   path: '/:catchAll(.*)',
    //   redirect: {
    //     name: '404'
    //   }
    // }
  ]
});

/**
 * Global guards
 *  - beforeEach
 *  - beforeResolve
 *  - afterEach
 */
router.beforeEach((to, from, next) => {
  console.log(`Navigating from ${from.path} to ${to.path}`);
  // await delay(500);
  next(); // next is not necessary if there is no async data and there is no routing
});

export default router;
