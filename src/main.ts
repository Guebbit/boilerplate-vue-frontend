import { createApp, ref } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from "@/plugins/i18n";

import App from './App.vue'
import router from './router'

import '@/assets/styles/main.scss';

createApp(App)
    .use(createPinia())
    .use(router)
    .use(i18n)
    // .provide('providedRef', ref('From main.ts'))
    .mount('#app');
