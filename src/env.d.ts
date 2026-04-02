/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_DEFAULT_LOCALE: string | undefined;
    readonly VITE_APP_SUPPORTED_LOCALES: string | undefined;
    readonly VITE_APP_PUBLIC_PATH: string | undefined;
    readonly VITE_APP_BASE_URL: string | undefined;
    readonly VITE_API_URL: string | undefined;
    readonly VITE_API_WEBSOCKET: string | undefined;
    readonly VITE_AXIOS_TIMEOUT: string | undefined;
    readonly VITE_USE_FAKE_API: string | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
