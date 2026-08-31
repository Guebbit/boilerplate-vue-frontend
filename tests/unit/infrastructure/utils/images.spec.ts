/**
 * `src/infrastructure/utils/images.ts` — the two answers to "what goes in `src`".
 *
 * The interesting one is {@link resolveImageUrl}, and it is interesting because the behaviour it
 * replaced looked correct: the API returns `/images/<hash>.png`, that is a perfectly good `src`,
 * and it renders nothing at all whenever the API is on another origin — which is the default
 * arrangement here and every deployment that is not single-origin. Nothing caught it, including
 * the e2e suite, because asserting on the `src` ATTRIBUTE asserts a string and never that a byte
 * arrived. So the assertions below are about the prefix, and the cases either side of it: the
 * shapes that must be left exactly alone. `thumbnailUrl` goes through the same function — the
 * backend promotes it to its own server-relative path, exactly like `imageUrl` — which is why
 * there is no separate `thumbnailImageUrl` leaf to test any more.
 *
 * `baseURL` is written directly on the axios instance rather than stubbed through the env, because
 * that is where the function reads it from — including the e2e runner's runtime override, which no
 * build-time env read can see.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { instance } from '@/infrastructure/http/client';
import { placeholderImageUrl, resolveImageUrl } from '@/infrastructure/utils/images';

const originalBaseUrl = instance.defaults.baseURL;

beforeEach(() => {
    instance.defaults.baseURL = 'https://api.example.test';
});

afterEach(() => {
    instance.defaults.baseURL = originalBaseUrl;
});

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

describe('placeholderImageUrl', () => {
    it('is the bundled asset, same-origin', () => {
        expect(placeholderImageUrl()).toBe('/images/no-image-placeholder.svg');
    });
});
