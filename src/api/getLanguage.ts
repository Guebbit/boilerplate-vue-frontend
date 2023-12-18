import en from "@/locales/en.json";

/**
 * Demo of new locale loading from a server
 */
export default () =>
    new Promise(resolve => setTimeout(() => resolve(en), 1000))