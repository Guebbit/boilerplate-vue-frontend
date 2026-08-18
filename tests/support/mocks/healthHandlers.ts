import { http, type HttpHandler } from 'msw';
import { GetHealthResponse } from '@api/schemas';
import { createSuccessEnvelope } from './mockDb.ts';
import { toMockJsonResponse } from './mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * The public liveness ping, `GET /`. Infrastructure like `/locales` — the shell's health banner
 * probes it at every mount, and an unanswered probe would paint "server unreachable" over a mock
 * that is very much alive.
 */
export const registerHealthMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/`, () =>
        toMockJsonResponse(createSuccessEnvelope({ status: 'ok' }), {
            schema: GetHealthResponse,
            delayMs: 0
        })
    )
];
