/**
 * A paged list keeps its filters and page in the URL, through the one composable that does it.
 *
 * A filtered view that cannot be bookmarked, reloaded or handed to support is a view described
 * over chat instead. `useListUrlState` is the single copy of that wiring; a page that rolls its
 * own, or forgets it, is the drift this file refuses.
 *
 * The rule: every module component that mounts `<ListPagination` calls `useListUrlState`, unless
 * it is listed in {@link NO_URL_STATE} with the reason it has nothing to keep.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repo root, two levels above this file. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Every non-test `.vue` or `.ts` file under `src`, repo-relative.
 */
const sourceFiles = (): string[] =>
    readdirSync(path.join(REPO_ROOT, 'src'), { withFileTypes: true, recursive: true })
        .filter((entry) => entry.isFile() && /\.(vue|ts)$/.test(entry.name))
        .map((entry) => path.relative(REPO_ROOT, path.join(entry.parentPath, entry.name)))
        .filter((file) => !file.split(path.sep).includes('tests'));

/**
 * A repo-relative file's text.
 *
 * @param file - The file, relative to the repo root.
 */
const sourceOf = (file: string): string => readFileSync(path.join(REPO_ROOT, file), 'utf8');

/** Pages that mount a pager and still keep no URL state, with the reason. */
const NO_URL_STATE: Readonly<Record<string, string>> = {
    'src/modules/payments/components/AwaitingTransfersTable.vue':
        'the transfer queue has one fixed order and no filter: a page number is all there is',
    'src/modules/inventory/components/PreorderProductsTable.vue':
        'the preorder products tab has no filter; its page is the board tab beside it',
    'src/modules/locales/views/LocalesDictionary.vue':
        'a client-side filter over a board held in memory: no request, nothing a link could replay',
    'src/modules/webhooks/components/WebhookDeliveriesFilters.vue':
        'the filter form only; the page that mounts it, WebhookDeliveries.vue, owns the URL state'
};

/** The files that mount the shared pager: the population of the rule. */
const pagedFiles = (): string[] =>
    sourceFiles().filter(
        (file) =>
            file.startsWith('src/modules/') &&
            file.endsWith('.vue') &&
            sourceOf(file).includes('<ListPagination')
    );

describe('list state in the URL', () => {
    it('finds the paged lists it means to check', () => {
        // A canary: a renamed pager would leave the sweep empty and passing.
        expect(pagedFiles().length).toBeGreaterThanOrEqual(15);
    });

    it('has every paged list call `useListUrlState`, or say why not', () => {
        const without = pagedFiles()
            .filter((file) => !sourceOf(file).includes('useListUrlState('))
            .filter((file) => !(file in NO_URL_STATE));

        expect(without).toEqual([]);
    });
});
