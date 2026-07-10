import { defineConfig } from 'cypress';
import { loadEnv } from 'vite';

const viteEnvironment = loadEnv('', process.cwd(), '');

export default defineConfig({
    fixturesFolder: 'tests/e2e/fixtures',
    screenshotsFolder: 'tests/e2e/screenshots',
    videosFolder: 'tests/e2e/videos',
    downloadsFolder: 'tests/e2e/downloads',
    e2e: {
        specPattern: 'tests/e2e/specs/**/*.{cy,spec}.{js,jsx,ts,tsx}',
        supportFile: 'tests/e2e/support/e2e.ts',
        baseUrl: 'http://localhost:4173',
        allowCypressEnv: false,
        env: {
            apiUrl: viteEnvironment.VITE_API_URL ?? 'http://localhost:3000'
        }
    }
});
