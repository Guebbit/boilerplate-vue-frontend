/**
 * The one MSW server every unit spec shares. Started by `setup.ts`; a spec adds its own handlers
 * with `server.use(...)`, and they are dropped again after each test.
 *
 * Imports only `msw/node`, so the setup file stays free of the app graph (see `setup.ts`).
 */
import { setupServer } from 'msw/node';

/**
 * Intercepts `fetch`, XHR and `node:http(s)` inside the test process. Created with no handlers on
 * purpose: a request nobody mocked is refused, never sent.
 * https://mswjs.io/docs/api/setup-server
 */
export const server = setupServer();
