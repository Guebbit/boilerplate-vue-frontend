/**
 * @module
 * Every `StockMovementReason` the contract enumerates must have an `inventory-page.reason-*`
 * label in both locales — `MovementLedger.vue`'s filter and its ledger rows key off exactly this
 * pattern. `restock` shipped with the enum value but no label, so the filter and every `restock`
 * row showed the raw key instead of a word.
 *
 * Against the real i18n instance: vue-i18n resolves a missing key to the key itself, which is the
 * precise symptom this guards against.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { loadLocale, i18n } from '@/infrastructure/i18n';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { StockMovementReason } from '@api';

/**
 * Switches the active i18n locale and waits for the DOM-facing reactivity to settle.
 *
 * @param locale - Locale code to switch to.
 * @returns A promise resolving once the locale is active.
 */
const setLocale = (locale: string) => loadLocale(locale).then(() => nextTick());

describe('inventory reason labels', () => {
    beforeAll(() => {
        wireModulesIntoCore();
        return setLocale('en');
    });
    afterEach(() => setLocale('en'));

    it.each(['en', 'it'])('has a label for every StockMovementReason in %s', (locale) =>
        setLocale(locale).then(() => {
            for (const reason of Object.values(StockMovementReason)) {
                const key = `inventory-page.reason-${reason}`;
                expect(i18n.global.t(key)).not.toBe(key);
            }
        })
    );
});
