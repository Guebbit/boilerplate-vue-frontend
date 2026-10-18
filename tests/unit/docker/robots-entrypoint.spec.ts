/**
 * `docker/docker-entrypoint.d/42-generate-robots.sh` and the `nginx.conf` that reads what it
 * writes: off by default (noindex on every response, crawling allowed), on only for an explicit
 * `true`, and no location of the server dropping the header.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** The entrypoint script under test. */
const script = path.resolve(__dirname, '../../../docker/docker-entrypoint.d/42-generate-robots.sh');

/** The nginx server config that reads the variable the script defines. */
const nginxConfig = readFileSync(path.resolve(__dirname, '../../../docker/nginx.conf'), 'utf8');

/** The throwaway web root and nginx include folder each case writes into. */
let root = '';
let configDirectory = '';

/**
 * Runs the script against the scratch folders with exactly the given variables.
 */
const run = (environment: Record<string, string>): void => {
    const { status } = spawnSync('sh', [script], {
        env: {
            PATH: process.env.PATH ?? '',
            NGINX_HTML_ROOT: root,
            NGINX_CONF_DIR: configDirectory,
            ...environment
        }
    });
    expect(status).toBe(0);
};

/** The generated `robots.txt`. */
const robotsTxt = (): string => readFileSync(path.join(root, 'robots.txt'), 'utf8');

/** The generated nginx `map` that sets `$robots_tag`. */
const robotsMap = (): string =>
    readFileSync(path.join(configDirectory, '00-robots-tag.conf'), 'utf8');

beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'robots-root-'));
    configDirectory = mkdtempSync(path.join(os.tmpdir(), 'robots-conf-'));
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(configDirectory, { recursive: true, force: true });
});

describe('42-generate-robots.sh', () => {
    it('keeps the site out by default: noindex everywhere, crawling allowed, no sitemap named', () => {
        run({ VITE_API_URL: 'https://api.example.test' });

        expect(robotsMap()).toContain('default "noindex, nofollow";');
        expect(robotsTxt()).toBe('User-agent: *\nAllow: /\n');
    });

    it.each(['false', 'FALSE', '0', 'no', 'maybe', ''])('treats %j as off', (value) => {
        run({ VITE_ROBOTS_INDEX: value });

        expect(robotsMap()).toContain('default "noindex, nofollow";');
    });

    it.each(['true', 'TRUE', '1', 'yes', 'on'])(
        'lets the site be indexed for %j: no header, and the API sitemap named',
        (value) => {
            run({ VITE_ROBOTS_INDEX: value, VITE_API_URL: 'https://api.example.test' });

            expect(robotsMap()).toContain('default "";');
            expect(robotsTxt()).toBe(
                'User-agent: *\nAllow: /\n\nSitemap: https://api.example.test/sitemap/index.xml\n'
            );
        }
    );

    it('writes one slash between the API address and the sitemap path', () => {
        run({ VITE_ROBOTS_INDEX: 'true', VITE_API_URL: 'https://api.example.test/' });

        expect(robotsTxt()).toContain('Sitemap: https://api.example.test/sitemap/index.xml\n');
    });

    it('names no sitemap when indexing is on but the API address is unknown', () => {
        run({ VITE_ROBOTS_INDEX: 'true' });

        expect(robotsTxt()).toBe('User-agent: *\nAllow: /\n');
    });

    it('goes back to off when the setting is withdrawn', () => {
        run({ VITE_ROBOTS_INDEX: 'true' });
        run({});

        expect(robotsMap()).toContain('default "noindex, nofollow";');
    });

    it('cannot be made to inject a robots.txt rule through a newline in the API address', () => {
        run({
            VITE_ROBOTS_INDEX: 'true',
            VITE_API_URL: 'https://api.example.test\nDisallow: /'
        });

        expect(robotsTxt()).not.toMatch(/^Disallow/m);
    });
});

/** How many times the nginx config sets `header`, whatever block it sits in. */
const countOf = (header: string): number => nginxConfig.split(header).length - 1;

describe('nginx.conf and the robots header', () => {
    it('sets the robots header wherever it sets the security headers', () => {
        // `add_header` does not merge across levels: the server and every location with a header
        // of its own repeat the whole set, so the two counts move together or a response loses one.
        const securityBlocks = countOf('add_header X-Content-Type-Options "nosniff" always;');

        expect(securityBlocks).toBeGreaterThanOrEqual(6);
        expect(countOf('add_header X-Robots-Tag $robots_tag always;')).toBe(securityBlocks);
    });

    it('serves robots.txt as text from a file, never the SPA fallback', () => {
        const block = nginxConfig.slice(nginxConfig.indexOf('location = /robots.txt'));

        expect(block.slice(0, block.indexOf('}'))).toMatch(
            /default_type text\/plain;[\S\s]*try_files \$uri =404;/
        );
    });
});
