/**
 * @module
 * `oauthCallbackLocation`: the backend's locale-less redirect lands in the language the visitor
 * started the login in, when this build speaks it — and in the default one otherwise.
 */
import { describe, it, expect } from 'vitest';
import { oauthCallbackLocation } from '@/app/router/oauth-callback.ts';
import { getDefaultLocale, supportedLanguages } from '@/i18n';

/**
 * A bundled locale that is not the default, so the assertion can tell the two apart.
 */
const other = supportedLanguages.find((tag) => tag !== getDefaultLocale())!;

describe('oauthCallbackLocation', () => {
    it('opens the callback in the carried locale', () => {
        expect(oauthCallbackLocation({ locale: other })).toMatchObject({
            name: 'OAuthCallback',
            params: { locale: other }
        });
    });

    it('falls back to the default locale when none was carried', () => {
        expect(oauthCallbackLocation({})).toMatchObject({
            params: { locale: getDefaultLocale() }
        });
    });

    it.each([
        ['one this build does not speak', 'xx'],
        ['a repeated param', ['it', 'en']],
        ['markup', '<script>']
    ])('ignores %s', (_label, locale) => {
        expect(oauthCallbackLocation({ locale })).toMatchObject({
            params: { locale: getDefaultLocale() }
        });
    });

    it('passes every other key through and drops `locale` from the query', () => {
        expect(
            oauthCallbackLocation({ locale: other, error: 'access_denied', continue: '/cart' })
        ).toMatchObject({ query: { error: 'access_denied', continue: '/cart' } });
        expect(oauthCallbackLocation({ locale: other })).toHaveProperty('query', {});
    });
});
