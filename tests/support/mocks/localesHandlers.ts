import { http, type HttpHandler } from 'msw';
import { GetLocalesResponse, GetLocaleMessagesResponse } from '@api/schemas';
import { createSuccessEnvelope, createErrorEnvelope } from './mockDb.ts';
import { toMockJsonResponse } from './mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Stands in for the API's language manifest and the overrides it serves.
 *
 * Two behaviours have to be reachable with no backend running, because they are the whole point of
 * the tier and neither can be seen from a bundled dictionary alone:
 *
 *   `es` — offered by the API and NOT bundled here. Its entire interface comes from the overrides
 *          below, and every key they do not carry falls back to English, key by key. That is what
 *          a language added by a translator looks like before it is finished.
 *   `it` — bundled AND overridden. One key is edited to prove the merge is per key and deep: the
 *          rest of `navigation` must survive an override that names one of its children.
 *
 * The overrides are deliberately tiny and they use REAL keys from `src/locales/en.json`. They are
 * not a second copy of anyone's dictionary and must never grow into one — a full Spanish belongs
 * in the database this stands in for, and a full Italian is already in `src/locales/it.json`.
 */
const LOCALE_OVERRIDES: Record<string, Record<string, unknown>> = {
    /*
     * A language this build does not ship. Enough keys to make the switch visible on the home
     * page, and nowhere near enough to finish it — the gaps are the demonstration.
     */
    es: {
        navigation: {
            ['label-home']: 'Inicio',
            ['label-menu']: 'Menú',
            ['label-language']: 'Idioma'
        },
        generic: {
            product: 'producto | productos',
            search: 'Buscar',
            cancel: 'Cancelar'
        },
        ['api-errors']: {
            unauthorized: 'No has iniciado sesión, o tu sesión ha caducado.',
            unknown: 'Algo ha salido mal. Inténtalo de nuevo.'
        }
    },
    /*
     * One key, on a language that HAS a bundled dictionary. `it.json` already translates every
     * sibling under `navigation`, so if the merge were shallow this row would delete them all —
     * which is precisely the regression this fixture exists to make visible in the running app.
     */
    it: {
        navigation: {
            ['label-home']: 'Pagina iniziale'
        }
    }
};

/** The manifest as the API composes it: both tiers merged, one row per language. */
const LOCALE_CAPABILITIES = [
    {
        tag: 'en',
        active: true,
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        // Deployed on the API, nothing edited: it can answer, there is nothing to download.
        scopes: ['api'],
        source: 'static',
        entryCount: 0,
        revision: 0
    },
    {
        tag: 'it',
        active: true,
        name: 'Italian',
        nativeName: 'Italiano',
        direction: 'ltr',
        scopes: ['api', 'app'],
        source: 'both',
        entryCount: 1,
        revision: 1
    },
    {
        tag: 'es',
        active: true,
        name: 'Spanish',
        nativeName: 'Español',
        direction: 'ltr',
        scopes: ['api', 'app'],
        source: 'both',
        entryCount: 8,
        revision: 1
    }
];

/*
 * SHADOWED while the `locales` module is enabled: `apiMock.ts` registers module handlers first
 * and MSW takes the first match, so `src/modules/locales/mocks/handlers.ts` — which serves the
 * same fixture out of the writable database — answers both reads instead. These static handlers
 * are the floor that keeps the language switcher working after `rm -rf src/modules/locales`.
 */
export const registerLocalesMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/locales`, () =>
        toMockJsonResponse(
            createSuccessEnvelope({
                locales: LOCALE_CAPABILITIES,
                default: 'en',
                fallback: 'en'
            }),
            { schema: GetLocalesResponse, delayMs: 0 }
        )
    ),
    http.get(`${API_BASE}/locales/:locale/messages`, ({ params }) => {
        const locale = String(params.locale);
        const messages = LOCALE_OVERRIDES[locale];

        /*
         * 404 for a language with no row, matching the API: unknown and deactivated answer the
         * same way, and the client treats both as "nothing has been edited here".
         */
        if (!messages)
            return toMockJsonResponse(
                createErrorEnvelope(404, 'NOT_FOUND', 'Error: invalid data provided.'),
                { status: 404, delayMs: 0 }
            );

        return toMockJsonResponse(createSuccessEnvelope({ locale, revision: 1, messages }), {
            schema: GetLocaleMessagesResponse,
            delayMs: 0
        });
    })
];
