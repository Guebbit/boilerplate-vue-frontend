/**
 * Mounts a badge's setup the way the shell runs it: inside a component, under a router, so the
 * route-change trigger has a route to watch. Returns the router, to navigate, and what the setup
 * returned.
 */
import { createMemoryHistory, createRouter } from 'vue-router';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

/**
 * A page that renders nothing: the routes only exist to be navigated between.
 */
const Blank = defineComponent({ render: () => null });

/**
 * The render function of the host component: nothing.
 */
const renderNothing = () => null;

/**
 * @param setup - the badge accessor (or any composable) to run in `setup`
 * @returns the router, the setup's result and the mounted wrapper
 */
export const mountBadge = async <T>(setup: () => T) => {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', component: Blank },
            { path: '/a', component: Blank },
            { path: '/b', component: Blank }
        ]
    });
    await router.push('/');
    await router.isReady();
    let result: T | undefined;
    const wrapper = mount(
        defineComponent({
            setup() {
                result = setup();
                return renderNothing;
            }
        }),
        { global: { plugins: [router] } }
    );
    return { router, wrapper, result: result as T };
};

/**
 * Makes the tab visible (or hidden) and tells the page, as the browser does.
 *
 * @param state - the new `document.visibilityState`
 */
export const setVisibility = (state: 'visible' | 'hidden'): void => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
};
