/**
 * The translation surface's slice of the mock database: the dynamic-tier language rows and the
 * entries stored against them.
 *
 * Seeded rather than empty — unlike the feedback inbox — because the CONSUMER half of this tier
 * runs at every boot: `tests/e2e/specs/locale.cy.ts` proves a language this build does not bundle
 * (`es`) reaches the switcher and renders from overrides alone, and that needs rows to exist
 * before any admin touches the screens. The rows are the same fixture
 * `tests/support/mocks/localesHandlers.ts` serves statically; this module's handlers shadow that
 * file while enabled (module handlers register first in `apiMock.ts`) and make the same data
 * writable.
 *
 * The overrides deliberately use REAL keys from `src/locales/en.json` and stay tiny — they are
 * not a second copy of anyone's dictionary. See the central fixture for the full reasoning.
 */
import type { Language, LocaleEntry } from '@types';
import type { MockSeedData } from '@/kernel/registry';
import { flattenDictionary } from '../dictionaries';

declare module '@/kernel/registry' {
    interface MockSeedData {
        /** Dynamic-tier `Language` rows — what the admin writes actually edit. */
        sampleLanguages: Language[];
        /** Every stored translation row, all languages together, like the real collection. */
        sampleLocaleEntries: LocaleEntry[];
    }
}

/*
 * FIXED, not `new Date()`: the visual baseline photographs the entries table's "Updated" column,
 * and a seed stamped at build time would re-date itself on every run — a baseline that fails
 * tomorrow for no reason anyone can see in a diff. Writes made DURING a test still stamp real
 * time in the handlers, which is what a test asserting freshness wants.
 */
const SEED_TIMESTAMP = '2026-01-01T10:00:00.000Z';

/** One dynamic-tier row. The tag decides `baseLanguage`, exactly as the API derives it. */
const createSeedLanguage = (
    tag: string,
    name: string,
    nativeName: string,
    revision: number
): Language => ({
    id: `language-${tag}`,
    tag,
    baseLanguage: tag.slice(0, 2),
    name,
    nativeName,
    direction: 'ltr',
    active: true,
    revision,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
});

/*
 * The stored overrides, per language — the same fixture the static handlers serve, kept nested
 * here because that is the readable shape and flattened into rows below, exactly as an import
 * would store them.
 */
const SEED_OVERRIDES: Record<string, Record<string, unknown>> = {
    es: {
        navigation: {
            ['label-home']: 'Inicio',
            ['label-menu']: 'Menú',
            ['label-language']: 'Idioma'
        },
        generic: {
            product: 'producto | productos',
            search: 'Buscar',
            cancel: 'Cancelar'
        },
        ['api-errors']: {
            unauthorized: 'No has iniciado sesión, o tu sesión ha caducado.',
            unknown: 'Algo ha salido mal. Inténtalo de nuevo.'
        }
    },
    it: {
        navigation: {
            ['label-home']: 'Pagina iniziale'
        }
    }
};

let entryIdCounter = 0;

/** The dynamic tier as freshly seeded: `it` and `es`, with their overrides flattened into rows. */
export const buildLocalesMockSeeds = (): Promise<Partial<MockSeedData>> =>
    Promise.resolve({
        sampleLanguages: [
            createSeedLanguage('it', 'Italian', 'Italiano', 1),
            createSeedLanguage('es', 'Spanish', 'Español', 1)
        ],
        sampleLocaleEntries: Object.entries(SEED_OVERRIDES).flatMap(([tag, dictionary]) =>
            flattenDictionary(dictionary as Parameters<typeof flattenDictionary>[0]).map(
                ({ key, value }): LocaleEntry => ({
                    id: `locale-entry-${++entryIdCounter}`,
                    locale: tag,
                    scope: 'app',
                    key,
                    value,
                    createdAt: SEED_TIMESTAMP,
                    updatedAt: SEED_TIMESTAMP
                })
            )
        )
    });
