/**
 * `LazyImage.vue` — the four decisions every stored picture in this app now goes through.
 *
 * Three of them are invisible until they are wrong, which is why they are pinned here rather than
 * left to the visual suite:
 *
 *   1. **The placeholder is chosen by absence, not by failure.** A record with no picture and a
 *      record whose picture 404s must both end up showing the stand-in — the second only after the
 *      browser has actually given up, so a slow image is never replaced by a dog mid-load.
 *   2. **`alt` follows what is on screen.** Announcing "Photo of Blue Widget" over a stock dog is
 *      a lie told to exactly the visitors who cannot check it. The one exception is `alt=""`,
 *      which means decorative and has to STAY decorative in every tier — the account button in the
 *      navigation carries its own name, and an avatar that announced itself would say it twice.
 *   3. **Failure state is per-URL, not per-instance.** A `v-for` over table rows recycles one
 *      component across many records; without a reset, the first broken image in a list would
 *      leave every row after it showing the placeholder.
 *
 * The fourth — `loading="lazy"` — is a one-line attribute assertion, and it is here because it is
 * the entire performance claim the component makes.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LazyImage from '@/ui/molecules/LazyImage.vue';
import vuetify from '@/ui/vuetify';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import { instance } from '@/infrastructure/http/client';
import enMessages from '@/locales/en.json';

/**
 * The dictionary has to be loaded, and this is not boilerplate.
 *
 * Without it `t('image.placeholder-alt')` answers the KEY, the component renders the key, and an
 * assertion comparing the two agrees with itself — a green test proving only that vue-i18n is
 * consistent about failing. Asserting against the JSON is what makes it a real comparison.
 */
beforeAll(() => loadLocale('en'));

/** The wording the placeholder announces, read from the dictionary rather than duplicated. */
const PLACEHOLDER_ALT = enMessages.image['placeholder-alt'];

/**
 * @param props - Overrides for the mount.
 * @returns The mounted component.
 */
const mountImage = (props: Record<string, unknown> = {}) =>
    mount(LazyImage, {
        props: { alt: 'Photo of Blue Widget', ...props },
        global: { plugins: [vuetify, i18n] }
    });

/** The full-image layer — always the LAST `img`, under any thumbnail tier. */
const mainImage = (wrapper: ReturnType<typeof mountImage>) => wrapper.findAll('img').at(-1)!;

describe('LazyImage — which picture is shown', () => {
    it('shows the record’s own image, resolved against the API origin', () => {
        const wrapper = mountImage({ src: '/images/abc.png' });

        expect(mainImage(wrapper).attributes('src')).toBe(
            `${String(instance.defaults.baseURL)}/images/abc.png`
        );
        expect(wrapper.attributes('data-placeholder')).toBeUndefined();
    });

    it('shows the placeholder when the record has no image', () => {
        const wrapper = mountImage({ src: undefined, width: 56, height: 56 });

        expect(mainImage(wrapper).attributes('src')).toBe('https://placedog.net/56/56');
        expect(wrapper.attributes('data-placeholder')).toBe('true');
    });

    it('falls back to the placeholder only once the browser has given up', async () => {
        const wrapper = mountImage({ src: '/images/gone.png', width: 56, height: 56 });

        // Before the error the real URL is still on screen: a slow image must not be pre-empted.
        expect(mainImage(wrapper).attributes('src')).toContain('/images/gone.png');

        await mainImage(wrapper).trigger('error');

        expect(mainImage(wrapper).attributes('src')).toBe('https://placedog.net/56/56');
    });

    it('gives a new record a clean slate after the previous one failed', async () => {
        // The `v-for` case: one component instance, many rows. Without the reset, the first
        // broken image in a list poisons every row rendered into that slot afterwards.
        const wrapper = mountImage({ src: '/images/gone.png' });
        await mainImage(wrapper).trigger('error');
        expect(wrapper.attributes('data-placeholder')).toBe('true');

        await wrapper.setProps({ src: '/images/next.png' });

        expect(wrapper.attributes('data-placeholder')).toBeUndefined();
        expect(mainImage(wrapper).attributes('src')).toContain('/images/next.png');
    });
});

describe('LazyImage — what it announces', () => {
    it('uses the caller’s alt for the record’s own image', () => {
        const wrapper = mountImage({ src: '/images/abc.png' });

        expect(mainImage(wrapper).attributes('alt')).toBe('Photo of Blue Widget');
    });

    it('says it is a stand-in when it is showing one', () => {
        const wrapper = mountImage({ src: undefined });

        expect(mainImage(wrapper).attributes('alt')).toBe(PLACEHOLDER_ALT);
        expect(mainImage(wrapper).attributes('alt')).not.toBe('Photo of Blue Widget');
        // The dictionary really did resolve — see the note on `beforeAll`.
        expect(PLACEHOLDER_ALT).not.toBe('image.placeholder-alt');
    });

    it('keeps an explicitly empty alt empty, placeholder included', () => {
        // The navigation avatar: the button already carries the accessible name.
        const wrapper = mountImage({ src: undefined, alt: '' });

        expect(mainImage(wrapper).attributes('alt')).toBe('');
    });
});

describe('LazyImage — how it loads', () => {
    it('defers the fetch until the image is near the viewport', () => {
        expect(mainImage(mountImage({ src: '/images/abc.png' })).attributes('loading')).toBe(
            'lazy'
        );
    });

    it('loads at once when the caller knows the image is above the fold', () => {
        const wrapper = mountImage({ src: '/images/abc.png', eager: true });

        expect(mainImage(wrapper).attributes('loading')).toBe('eager');
    });

    it('reserves the box before anything arrives, so a late image cannot reflow the row', () => {
        const wrapper = mountImage({ src: '/images/abc.png', width: 56, height: 72 });

        expect(wrapper.attributes('style')).toContain('width: 56px');
        expect(wrapper.attributes('style')).toContain('aspect-ratio: 56 / 72');
    });

    it('renders no thumbnail tier while the API serves no sized variants', () => {
        // Today's backend. The single `img` IS the assertion: a second one would mean the
        // component is painting a blurred layer with nothing behind it.
        expect(mountImage({ src: '/images/abc.png' }).findAll('img')).toHaveLength(1);
    });
});
