/**
 * `src/infrastructure/utils/images.ts` — the three answers to "what goes in `src`".
 *
 * The interesting one is {@link resolveImageUrl}, and it is interesting because the behaviour it
 * replaced looked correct: the API returns `/images/<hash>.png`, that is a perfectly good `src`,
 * and it renders nothing at all whenever the API is on another origin — which is the default
 * arrangement here and every deployment that is not single-origin. Nothing caught it, including
 * the e2e suite, because asserting on the `src` ATTRIBUTE asserts a string and never that a byte
 * arrived. So the assertions below are about the prefix, and the cases either side of it: the
 * shapes that must be left exactly alone.
 *
 * `baseURL` is written directly on the axios instance rather than stubbed through the env, because
 * that is where the function reads it from — including the e2e runner's runtime override, which no
 * build-time env read can see.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instance } from '@/infrastructure/http/client';
import {
    placeholderImageUrl,
    resolveImageUrl,
    thumbnailImageUrl
} from '@/infrastructure/utils/images';

const originalBaseUrl = instance.defaults.baseURL;

beforeEach(() => {
    instance.defaults.baseURL = 'https://api.example.test';
});

afterEach(() => {
    instance.defaults.baseURL = originalBaseUrl;
});

/**
 * The thumbnail parameter is read at module load, so the module has to be re-imported after the
 * env is stubbed — the top-level import would freeze the unset value.
 *
 * `resetModules` re-evaluates the axios client along with it, so the fresh instance has to be
 * given the same `baseURL` the suite's `beforeEach` puts on the original one. Without that, the
 * block below would silently assert against whatever `.env` happens to say.
 *
 * @returns The freshly evaluated images module, with thumbnails switched on.
 */
const withThumbnails = async () => {
    vi.stubEnv('VITE_IMAGE_THUMBNAIL_PARAM', 'w');
    vi.resetModules();
    const { instance: freshInstance } = await import('@/infrastructure/http/client');
    freshInstance.defaults.baseURL = 'https://api.example.test';
    return import('@/infrastructure/utils/images');
};

describe('resolveImageUrl', () => {
    it('prefixes a path the API returned with the API origin', () => {
        expect(resolveImageUrl('/images/abc.png')).toBe('https://api.example.test/images/abc.png');
    });

    it('joins exactly one slash, whatever the two sides bring', () => {
        instance.defaults.baseURL = 'https://api.example.test/';

        // `//images/…` is not a cosmetic problem: a browser reads a leading `//` as a HOST.
        expect(resolveImageUrl('/images/abc.png')).toBe('https://api.example.test/images/abc.png');
        expect(resolveImageUrl('images/abc.png')).toBe('https://api.example.test/images/abc.png');
    });

    it.each([
        ['https://cdn.example.test/a.png'],
        ['http://cdn.example.test/a.png'],
        ['//cdn.example.test/a.png'],
        ['data:image/png;base64,AAAA'],
        ['blob:http://localhost:8080/9f8e-7d6c']
    ])('leaves %s alone, it is already fetchable', (source) => {
        expect(resolveImageUrl(source)).toBe(source);
    });

    it.each([[undefined], [null], ['']])(
        'answers undefined for %s, which is what selects the placeholder',
        (source) => {
            expect(resolveImageUrl(source)).toBeUndefined();
        }
    );

    it('returns a rooted path when the app and the API share an origin', () => {
        instance.defaults.baseURL = '';

        expect(resolveImageUrl('/images/abc.png')).toBe('/images/abc.png');
        expect(resolveImageUrl('images/abc.png')).toBe('/images/abc.png');
    });
});

describe('thumbnailImageUrl', () => {
    it('has nothing to offer while the API serves one size per upload', () => {
        // The state of the backend today: `VITE_IMAGE_THUMBNAIL_PARAM` unset. `undefined` is the
        // whole contract — it is what tells `LazyImage` there is no first tier to paint.
        expect(thumbnailImageUrl('/images/abc.png')).toBeUndefined();
    });

    describe('once the API serves sized variants', () => {
        afterEach(() => {
            vi.unstubAllEnvs();
            vi.resetModules();
        });

        it('asks for the width, on the resolved URL', async () => {
            const images = await withThumbnails();

            expect(images.thumbnailImageUrl('/images/abc.png', 64)).toBe(
                'https://api.example.test/images/abc.png?w=64'
            );
        });

        it('appends to a URL that already carries a query', async () => {
            const images = await withThumbnails();

            expect(images.thumbnailImageUrl('https://cdn.example.test/a.png?v=2', 32)).toBe(
                'https://cdn.example.test/a.png?v=2&w=32'
            );
        });

        it('still has nothing to offer for a record with no image', async () => {
            const images = await withThumbnails();

            expect(images.thumbnailImageUrl(undefined)).toBeUndefined();
        });
    });
});

describe('placeholderImageUrl', () => {
    it('is the bundled asset, same-origin', () => {
        expect(placeholderImageUrl()).toBe('/images/no-image-placeholder.svg');
    });
});
