import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for the locale ADMIN surface — the nine operations only this module
 * calls. Moved here from the core map's bottom shelf the day the module claimed them, exactly as
 * that shelf's docblock promised.
 *
 * The two public reads (`GET /locales`, `GET /locales/{tag}/messages`) are NOT here: the boot
 * path in `infrastructure/i18n/localeOverrides.ts` calls them whether or not this module is
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
