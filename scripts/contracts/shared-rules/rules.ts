/**
 * @module
 * The Zod schema of every frontend-owned rules file under `shared/rules/`, and what each one
 * generates. One entry per file: adding a rule is one schema and one row in {@link SHARED_RULES}.
 * `generate-shared-rules.ts` also exports each schema as JSON Schema, so another frontend can
 * validate the same files without Zod.
 *
 * See: docs/tools/shared-rules.md
 */
import { z } from 'zod';
import { buildBrowserStorage } from './browser-storage';
import type { GenerateSpec } from './generate-spec';

/** A map key that is also an identifier: camelCase, because it doubles as a translation key. */
const camelId = z.string().regex(/^[a-z][\dA-Za-z]*$/);

/** Where a stored item lives in the browser. */
const storageKind = z.enum(['cookie', 'localStorage', 'sessionStorage']);

/** Shape of `shared/rules/browser-storage.yaml`: the display order and the frontend's own rows. */
export const browserStorageSchema = z.strictObject({
    /** Every id of the inventory, backend cookies included, in the order the privacy page shows. */
    order: z.array(camelId).min(1),
    /** The rows the frontend or a library it loads writes, by id. */
    items: z.record(
        camelId,
        z.strictObject({
            /** The name the browser stores it under; a prefix when the code appends to it. */
            name: z.string().min(1),
            /** Who writes it. */
            setter: z.enum(['frontend', 'library']),
            /** Where it lives. */
            kind: storageKind,
            /** `necessary` is the ePrivacy Art. 5(3) exemption; `consent` exists only after consent. */
            necessity: z.enum(['necessary', 'consent']),
            /** The feature that has to be configured for the row to exist; absent means always. */
            when: z.enum(['analytics', 'faro']).optional()
        })
    )
});

/** Parsed `browser-storage.yaml`. */
export type BrowserStorageRules = z.infer<typeof browserStorageSchema>;

/**
 * The slice of the backend's synced `contracts/cookies.yaml` this repo reads. Loose on purpose:
 * the backend owns the rest of the row (purpose, secret, lifetime), and a new field there must
 * not break this build. `necessity` is a literal: the frontend's table has no word for
 * the backend's `preference`, and a build that fails is the way to find out.
 */
export const syncedCookiesSchema = z.strictObject({
    /** Rows by id. */
    cookies: z.record(
        camelId,
        z.looseObject({
            name: z.string().min(1),
            setter: z.literal('backend'),
            kind: z.literal('cookie'),
            necessity: z.literal('necessary')
        })
    )
});

/** Parsed `contracts/cookies.yaml`, the slice this repo reads. */
export type SyncedCookies = z.infer<typeof syncedCookiesSchema>;

/** Shape of `shared/rules/static-pages.yaml`. */
export const staticPagesSchema = z.strictObject({
    /** The prose pages, in link order. */
    pages: z
        .array(z.string().regex(/^[a-z]+$/))
        .min(1)
        .refine((pages) => new Set(pages).size === pages.length, {
            message: 'a page is listed twice'
        })
});

/** Shape of `shared/rules/tours.yaml`. */
export const toursSchema = z.strictObject({
    /** Tours by id. */
    tours: z
        .record(
            z.string().regex(/^[a-z][\da-z-]*$/),
            z.strictObject({
                /** Bumping it shows the tour once more to everyone. */
                version: z.int().positive(),
                /** Opens by itself after the first sign-in. */
                auto: z.boolean().optional()
            })
        )
        .refine((tours) => Object.keys(tours).length > 0, { message: 'no tour is listed' })
});

/** Shape of `shared/rules/notification-screens.yaml`. */
export const notificationScreensSchema = z.strictObject({
    /** Each staff summary notice code and the list it counts. */
    summaryScreens: z
        .record(
            z.string().regex(/^notifications\.staff\.[a-z-]+$/),
            z.enum(['sales-orders', 'payments', 'returns', 'preorders', 'inventory'])
        )
        .refine((screens) => Object.keys(screens).length > 0, { message: 'no notice is listed' })
});

/** Reads and validates one YAML file by repo-relative path. */
export type LoadRules = <T extends z.ZodType>(relative: string, schema: T) => z.infer<T>;

/** One rules file: where it is, how it is checked, what it writes. */
export interface SharedRule {
    /** Repo-relative path of the frontend-owned YAML. */
    source: string;
    /** Checks that YAML; also exported as `shared/rules/schemas/<name>.schema.json`. */
    schema: z.ZodType;
    /**
     * Cuts the generated constants' document from more than the YAML: it reads the backend files
     * `sync:frontend` copies in. Absent when the YAML stands alone.
     */
    derive?: (load: LoadRules) => unknown;
    /** Every repo-relative file the generated file is built from, named in its header. */
    inputs: readonly string[];
    /** What the generated file writes. */
    generate: GenerateSpec;
}

/** Every frontend-owned rules file, by name (the YAML's file name without its extension). */
export const SHARED_RULES = {
    'browser-storage': {
        source: 'shared/rules/browser-storage.yaml',
        schema: browserStorageSchema,
        inputs: ['shared/rules/browser-storage.yaml', 'contracts/cookies.yaml'],
        derive: (load) =>
            buildBrowserStorage(
                load('shared/rules/browser-storage.yaml', browserStorageSchema),
                load('contracts/cookies.yaml', syncedCookiesSchema)
            ),
        generate: {
            out: 'src/infrastructure/browser-storage.generated.ts',
            exports: [
                {
                    exportName: 'BROWSER_STORAGE_DATA',
                    shape: 'verbatim',
                    field: 'items',
                    description:
                        'Every item the browser holds for this app, backend cookies and own rows merged, in display order.'
                },
                {
                    exportName: 'BROWSER_STORAGE_NAMES',
                    shape: 'verbatim',
                    field: 'names',
                    description: 'The name each item is stored under, by id.'
                }
            ]
        }
    },
    'static-pages': {
        source: 'shared/rules/static-pages.yaml',
        inputs: ['shared/rules/static-pages.yaml'],
        schema: staticPagesSchema,
        generate: {
            out: 'src/app/utils/static-pages.generated.ts',
            exports: [
                {
                    exportName: 'STATIC_PAGE_NAMES',
                    shape: 'verbatim',
                    field: 'pages',
                    description: "The shop's prose pages, in the order they are linked everywhere."
                }
            ]
        }
    },
    tours: {
        source: 'shared/rules/tours.yaml',
        inputs: ['shared/rules/tours.yaml'],
        schema: toursSchema,
        generate: {
            out: 'src/app/tours/tours.generated.ts',
            exports: [
                {
                    exportName: 'TOUR_DATA',
                    shape: 'verbatim',
                    field: 'tours',
                    description: 'Every tour this build can run, by id, with its version.'
                }
            ]
        }
    },
    'notification-screens': {
        source: 'shared/rules/notification-screens.yaml',
        inputs: ['shared/rules/notification-screens.yaml'],
        schema: notificationScreensSchema,
        generate: {
            out: 'src/modules/notifications/domain/notification-screens.generated.ts',
            exports: [
                {
                    exportName: 'SUMMARY_SCREEN_DATA',
                    shape: 'verbatim',
                    field: 'summaryScreens',
                    description: 'The admin list each staff summary notice counts, by notice code.'
                }
            ]
        }
    }
} as const satisfies Record<string, SharedRule>;
