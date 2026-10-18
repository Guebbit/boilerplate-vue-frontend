/**
 * @module
 * The local stand-in for Faro's collector and Umami's script host during an audit.
 *
 * With `VITE_FARO_URL` / `VITE_UMAMI_SRC` pointing here, the consent banner shows and Faro boots
 * as on a first visit, while nothing leaves the machine. Every POST is answered `204`, and
 * `GET /script.js` is an empty script. Reasoning: `docs/tools/lighthouse.md`.
 */
import { createServer, type Server } from 'node:http';

/**
 * The sink's port. Clear of the demo backend (:3100), the sharded pool (:3101+), the webhook sink
 * (:3200+), the app (:8085), Faro's Alloy (:12347) and Umami (:3080).
 */
export const ANALYTICS_SINK_PORT = 3190;

/**
 * Where Faro should post, for the audit build's `VITE_FARO_URL`.
 *
 * @param port - the sink's port
 */
export const sinkCollectUrl = (port: number): string => `http://127.0.0.1:${String(port)}/collect`;

/**
 * Where Umami's tracker script is "hosted", for the audit build's `VITE_UMAMI_SRC`.
 *
 * @param port - the sink's port
 */
export const sinkScriptUrl = (port: number): string => `http://127.0.0.1:${String(port)}/script.js`;

/**
 * Starts the sink on loopback.
 *
 * @param port - the port to listen on
 * @returns the running server; reject with the listen error (`EADDRINUSE` when the port is taken)
 */
export const startAnalyticsSink = (port: number = ANALYTICS_SINK_PORT): Promise<Server> =>
    new Promise((resolve, reject) => {
        const server = createServer((request, response) => {
            if (request.method === 'GET' && request.url === '/script.js') {
                response.writeHead(200, { 'content-type': 'text/javascript' }).end('');
                return;
            }
            // Drain the body, then answer with nothing to say.
            request.resume();
            request.on('end', () => {
                response.writeHead(204).end();
            });
        });
        server.once('error', reject);
        // `127.0.0.1` only: the sink must never be reachable from another machine.
        server.listen(port, '127.0.0.1', () => {
            resolve(server);
        });
    });
