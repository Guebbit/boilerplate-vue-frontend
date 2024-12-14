import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from "@/plugins/i18n";

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
createApp(App)
    .use(createPinia())
    .use(router)
    .use(i18n)
    .mount('#app');