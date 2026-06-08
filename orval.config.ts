import { defineConfig } from 'orval';

/**
 * Orval configuration: generates the API client from openapi.yaml.
 *
 * mode: 'single' puts all types and functions into one file (api/index.ts),
 * preserving the existing @api alias without any tsconfig/vite changes.
 *
 * mutator: every generated function delegates HTTP calls to apiMutator,
 * which uses the shared httpClient (auth headers, token refresh, etc.).
 */
export default defineConfig({
    api: {
        input: './openapi.yaml',
        output: {
            mode: 'single',
            target: './api/index.ts',
            client: 'axios',
            override: {
                mutator: {
                    path: './src/utils/apiMutator.ts',
                    name: 'apiMutator',
                },
            },
        },
    },
});
