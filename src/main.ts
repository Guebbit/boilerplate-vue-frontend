import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { i18n } from '@/utils/i18n.ts';

import App from './App.vue';
import router from './router';
import { initializeApiMocking } from '../.dev/mocks/apiMock.ts';

/**
 * Global CSS
 */
import '@/styles/theme.scss';
import '@/styles/main.scss';

/**
 * Vue3 App
 */

const bootstrapApplication = async () => {
    await initializeApiMocking();
    createApp(App).use(createPinia()).use(router).use(i18n).mount('#app');
};

void bootstrapApplication();
