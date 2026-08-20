import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for the locale ADMIN surface — the nine operations only this module
 * calls. Registered through the module manifest; the rules every row obeys are on
 * {@link ResponseSchemaRoute}.
 *
 * The two public reads (`GET /locales`, `GET /locales/{tag}/messages`) are NOT here: the boot
 * path in `infrastructure/i18n/locale-overrides.ts` calls them whether or not this module is
 * enabled, so their rows stay in `coreRouteSchemas` with the code that needs them.
 *
 * Same regex discipline as the core rows: every single-segment pattern is `$`-anchored so
 * `/locales/es` never swallows `/locales/es/entries`.
 */
export const localesResponseSchemas: ResponseSchemaRoute[] = [
    { method: 'POST', pattern: /^\/locales$/, schema: schemas.CreateLocaleResponse },
    { method: 'PUT', pattern: /^\/locales\/[^/]+$/, schema: schemas.UpdateLocaleResponse },
    { method: 'DELETE', pattern: /^\/locales\/[^/]+$/, schema: schemas.DeleteLocaleResponse },
    {
        method: 'GET',
        pattern: /^\/locales\/[^/]+\/entries(\?.*)?$/,
        schema: schemas.ListLocaleEntriesResponse
    },
    {
        method: 'POST',
        pattern: /^\/locales\/[^/]+\/entries$/,
        schema: schemas.CreateLocaleEntryResponse
    },
    {
        method: 'PUT',
        pattern: /^\/locales\/[^/]+\/entries$/,
        schema: schemas.ReplaceLocaleEntriesResponse
    },
    {
        method: 'PATCH',
        pattern: /^\/locales\/[^/]+\/entries$/,
        schema: schemas.MergeLocaleEntriesResponse
    },
    {
        method: 'PUT',
        pattern: /^\/locales\/[^/]+\/entries\/[^/]+$/,
        schema: schemas.UpdateLocaleEntryResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/locales\/[^/]+\/entries\/[^/]+$/,
        schema: schemas.DeleteLocaleEntryResponse
    }
];
