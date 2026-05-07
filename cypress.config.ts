import { defineConfig } from 'cypress';
import { loadEnv } from 'vite';

const viteEnvironment = loadEnv('', process.cwd(), '');

export default defineConfig({
    e2e: {
        specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
        baseUrl: 'http://localhost:4173',
        allowCypressEnv: false,
        env: {
            apiUrl: viteEnvironment.VITE_API_URL ?? 'http://localhost:3000'
        }
    }
});
