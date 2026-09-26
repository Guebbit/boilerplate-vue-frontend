/**
 * `runtimeValue` — `src/infrastructure/runtime-config.ts`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { runtimeValue } from '@/infrastructure/runtime-config.ts';

afterEach(() => {
    Reflect.deleteProperty(globalThis, '__APP_CONFIG');
});

describe('runtimeValue', () => {
    it('is undefined when config.js never loaded (dev, unit tests, vite preview)', () => {
        expect(runtimeValue('API_URL')).toBeUndefined();
    });

    it('reads a value the container set', () => {
        (globalThis as { __APP_CONFIG?: object }).__APP_CONFIG = {
            API_URL: 'https://api.example.com'
        };
        expect(runtimeValue('API_URL')).toBe('https://api.example.com');
    });

    it('trims whitespace', () => {
        (globalThis as { __APP_CONFIG?: object }).__APP_CONFIG = {
            APP_NAME: '  My Shop  '
        };
        expect(runtimeValue('APP_NAME')).toBe('My Shop');
    });

    it('treats a blank string the same as unset — never an empty override', () => {
        (globalThis as { __APP_CONFIG?: object }).__APP_CONFIG = { API_URL: '   ' };
        expect(runtimeValue('API_URL')).toBeUndefined();
    });

    it('is undefined for a key config.js never set, even with others present', () => {
        (globalThis as { __APP_CONFIG?: object }).__APP_CONFIG = { API_URL: 'https://x' };
        expect(runtimeValue('LOCALE_TENANT')).toBeUndefined();
    });
});
