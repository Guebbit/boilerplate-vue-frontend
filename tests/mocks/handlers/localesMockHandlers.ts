import { http, type HttpHandler } from 'msw';
import { GetLocalesResponse, GetLocaleDictionaryResponse } from '@api/schemas';
import { createSuccessEnvelope, createErrorEnvelope } from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Stands in for the API's locale discovery endpoints.
 *
 * The interesting one is `es`: this app has no `src/locales/es.json`, so a user who picks Spanish
 * gets Spanish API copy inside an otherwise-English UI, degrading key by key through
 * `fallbackLocale`. That is the whole point of the API serving its own dictionary and this app
 * merging it under `api.*` — so the mock has to offer a locale this app does not, or the
 * behaviour cannot be exercised offline.
 *
 * The dictionaries are deliberately tiny. They are not the API's real copy and must never grow
 * into a second, drifting authority for it — they exist to prove the plumbing, and the API's
 * actual Spanish lives in `boilerplate-node-api-mongodb-mongoose/src/locales/es.json`.
 */
const API_DICTIONARIES: Record<string, Record<string, unknown>> = {
    en: {
        generic: {
            ['error-unknown']: 'Something went wrong with the request.',
            ['error-unauthorized']: 'You are not signed in, or your session has expired.',
            ['error-forbidden']: 'You do not have permission to do that.'
        }
    },
    it: {
        generic: {
            ['error-unknown']: 'Qualcosa è andato storto con la richiesta.',
            ['error-unauthorized']: 'Non hai effettuato l’accesso, oppure la sessione è scaduta.',
            ['error-forbidden']: 'Non hai i permessi per farlo.'
        }
    },
    es: {
        generic: {
            ['error-unknown']: 'Algo ha salido mal con la solicitud.',
            ['error-unauthorized']: 'No has iniciado sesión, o tu sesión ha caducado.',
            ['error-forbidden']: 'No tienes permiso para hacer eso.'
        }
    }
};

export const registerLocalesMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/locales`, () =>
        toMockJsonResponse(
            createSuccessEnvelope({
                locales: Object.keys(API_DICTIONARIES),
                default: 'en',
                fallback: 'en'
            }),
            { schema: GetLocalesResponse, delayMs: 0 }
        )
    ),
    http.get(`${API_BASE}/locales/:locale`, ({ params }) => {
        const locale = String(params.locale);
        const messages = API_DICTIONARIES[locale];

        if (!messages)
            return toMockJsonResponse(
                createErrorEnvelope(404, 'NOT_FOUND', 'Error: invalid data provided.'),
                { status: 404, delayMs: 0 }
            );

        return toMockJsonResponse(createSuccessEnvelope({ locale, messages }), {
            schema: GetLocaleDictionaryResponse,
            delayMs: 0
        });
    })
];
