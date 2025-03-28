import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from "@/utils/i18n.ts";

import App from './App.vue'
import router from './router'

/**
 * Global CSS
 */
import '@/assets/styles/theme.scss';
import '@/assets/styles/main.scss';

/**
 * Vue3 App
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
createApp(App)
    .use(createPinia())
    .use(router)
    .use(i18n)
    .mount('#app');