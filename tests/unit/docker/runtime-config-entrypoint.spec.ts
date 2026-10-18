/**
 * `index.html` loads the container-written `config.js` from the app's base, so a cold deep link
 * (`/en/products/42`) boots with its runtime config.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** The page shell Vite builds from. */
const indexHtml = readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');

describe('index.html runtime config script', () => {
    it('anchors config.js to the base, not to the page', () => {
        expect(indexHtml).toContain('<script src="%BASE_URL%config.js"></script>');
    });

    it('has no document-relative config.js, which a deep link would resolve under the route', () => {
        expect(indexHtml).not.toMatch(/src="\.\/config\.js"/);
    });
});
