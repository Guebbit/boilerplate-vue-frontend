/**
 * Two halves of the runtime config: `index.html` loads `config.js` from the app's base (so a cold
 * deep link such as `/en/products/42` boots with it), and
 * `docker/docker-entrypoint.d/40-generate-runtime-config.sh` writes it from the environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** The page shell Vite builds from. */
const indexHtml = readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');

/** The entrypoint script under test. */
const script = path.resolve(
    __dirname,
    '../../../docker/docker-entrypoint.d/40-generate-runtime-config.sh'
);

/** The throwaway web root each case writes into. */
let root = '';

/**
 * Runs the script against the scratch root with exactly the given variables.
 *
 * @returns the generated `config.js`
 */
const generate = (environment: Record<string, string>): string => {
    const { status } = spawnSync('sh', [script], {
        env: { PATH: process.env.PATH ?? '', NGINX_HTML_ROOT: root, ...environment }
    });
    expect(status).toBe(0);
    return readFileSync(path.join(root, 'config.js'), 'utf8');
};

beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'runtime-config-'));
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('index.html runtime config script', () => {
    it('anchors config.js to the base, not to the page', () => {
        expect(indexHtml).toContain('<script src="%BASE_URL%config.js"></script>');
    });

    it('has no document-relative config.js, which a deep link would resolve under the route', () => {
        expect(indexHtml).not.toMatch(/src="\.\/config\.js"/);
    });
});

describe('40-generate-runtime-config.sh', () => {
    it('writes under NGINX_HTML_ROOT, only the keys that are set', () => {
        const config = generate({ VITE_API_URL: 'http://localhost:3100' });

        expect(config).toContain('"API_URL": "http://localhost:3100",');
        expect(config).not.toContain('FARO_URL');
    });

    it('omits a blank key', () => {
        expect(generate({ VITE_API_URL: '' })).not.toContain('API_URL');
    });

    it('escapes a quote and drops a newline, so a value cannot break out of the string', () => {
        const config = generate({ VITE_APP_NAME: 'a"b\nc' });

        expect(config).toContain(String.raw`"APP_NAME": "a\"bc",`);
    });
});
