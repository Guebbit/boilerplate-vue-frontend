/**
 * Every `import.meta.env.VITE_*` key this app actually reads, typed — so a read of one that is
 * NOT declared here is a compile error instead of `any`. `ViteTypeOptions`'s
 * `strictImportMetaEnv` is what turns that off: without it, Vite's own `ImportMetaEnv` falls back
 * to `Record<string, any>` for any key nobody declared, which is silent, not strict.
 * https://vite.dev/guide/env-and-mode.html#intellisense-for-typescript
 *
 * `.env-example` is the source of truth for what each one means and defaults to; this file only
 * states the TYPE. Vite's own ambient interface still supplies `BASE_URL`, `MODE`, `DEV`, `PROD`
 * and `SSR` — declared here as an extension of `ImportMetaEnv`, per Vite's own module-augmentation
 * pattern, not a replacement of it.
 */
// eslint-disable-next-line unicorn/prevent-abbreviations -- fixed Vite ambient-type name; renaming it stops the declaration merge that makes it work
interface ViteTypeOptions {
    strictImportMetaEnv: unknown;
}

/**
 * Every declared key is optional (`?`): Vite only ever supplies a STRING, and an unset `.env`
 * entry is `undefined` at runtime, not a missing property — every read already chains a fallback
 * (`?? '10000'`, `|| 'Guebbit'`) for exactly that reason.
 */
// eslint-disable-next-line unicorn/prevent-abbreviations -- fixed Vite ambient-type name; renaming it stops the declaration merge that makes it work
interface ImportMetaEnv {
    readonly VITE_API_SSE?: string;
    readonly VITE_API_URL?: string;
    readonly VITE_APP_DEFAULT_LOCALE?: string;
    readonly VITE_APP_EMPTY_VALUE?: string;
    readonly VITE_APP_FALLBACK_LOCALE?: string;
    readonly VITE_APP_LOG_LEVEL?: string;
    readonly VITE_APP_LOG_SCOPES?: string;
    readonly VITE_APP_LOGO?: string;
    readonly VITE_APP_NAME?: string;
    readonly VITE_AXIOS_TIMEOUT?: string;
    readonly VITE_FARO_APP_NAME?: string;
    readonly VITE_FARO_APP_VERSION?: string;
    readonly VITE_FARO_ENVIRONMENT?: string;
    readonly VITE_FARO_URL?: string;
    readonly VITE_LOCALE_TENANT?: string;
    readonly VITE_MAX_UPLOAD_BYTES?: string;
    readonly VITE_UMAMI_SRC?: string;
    readonly VITE_UMAMI_WEBSITE_ID?: string;
    readonly VITE_UMAMI_REQUIRE_CONSENT?: string;
    readonly VITE_VALIDATE_REQUESTS?: string;
    readonly VITE_VALIDATE_RESPONSES?: string;
}
