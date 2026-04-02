import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { i18n } from '@/utils/i18n.ts';
import { setupFakeApiIfEnabled } from '@/mocks/fakeApi.ts';

import App from './App.vue';
import router from './router';

/**
 * Global CSS
 */
import '@/assets/styles/theme.scss';
import '@/assets/styles/main.scss';

/**
 * Vue3 App
 */

setupFakeApiIfEnabled();

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app');
