/**
 * Every destructive confirm names what it is destroying.
 *
 * `useDialogStore().confirm({ color: 'error', ... })` is this app's one "are you sure?" — a
 * delete, a revoke, a removal. Two rows in a list share the same component and the same generic
 * wording ("delete this item?"); they do not share an identity, and a bare "this" answers a
 * question the visitor did not ask. `feedback-inbox-page.confirm-delete` got this right from the
 * start (`t(key, { subject })`); users, api-keys, webhooks, products, orders and one address
 * confirm did not, until FA83 — this sweep is what stops the next one from drifting back.
 *
 * ── What counts as named ─────────────────────────────────────────────────────────────────────
 * The `message` passed to a `color: 'error'` confirm is a `t(key, { ... })` call with interpolation
 * params — a plain `t(key)` names nothing dynamic. A `message` built from a variable (not a direct
 * `t(...)` call) is read as already-named elsewhere and is not this sweep's business.
 *
 * ── The allowed exception ────────────────────────────────────────────────────────────────────
 * A confirm about the VIEWER'S OWN account — delete your account, remove your own avatar, log
 * out everywhere, disable your own two-factor — has no other row to name; "this" already IS the
 * one thing being asked about. Those live in `account`'s own profile components, and that file
 * list is the allowlist below — not a per-line exemption, since every confirm in these files is
 * one of these self-only actions.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_ROOT = path.resolve(ROOT, 'src/modules');

/**
 * Files whose every `color: 'error'` confirm is about the viewer's own account, with no row to
 * name — see the module docblock's "allowed exception".
 */
const SELF_ONLY_FILES = new Set([
    'src/modules/account/components/ProfileDeleteAccount.vue',
    'src/modules/account/components/ProfileSessions.vue',
    'src/modules/account/components/ProfileAvatar.vue',
    'src/modules/account/components/ProfileTwoFactor.vue'
]);

/** Every `.vue` file under `src/modules`, excluding anything under a `tests` folder. */
const componentFiles = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === 'tests' ? [] : componentFiles(entryPath);
        return entry.name.endsWith('.vue') ? [entryPath] : [];
    });

/**
 * Every `.confirm({ ... })` call's own object literal, brace-balanced so a nested object (the
 * `t(key, { name })` interpolation params this sweep is looking for) does not end the match early.
 */
const confirmBlocksOf = (source: string): string[] =>
    [...source.matchAll(/\.confirm\({/g)].map(({ index: start }) => {
        let depth = 0;
        for (let i = start + '.confirm('.length; i < source.length; i++) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') {
                depth--;
                if (depth === 0) return source.slice(start + '.confirm('.length, i + 1);
            }
        }
        return source.slice(start + '.confirm('.length);
    });

/** Whether a confirm block asks a destructive ("are you sure?") question. */
const isDestructive = (block: string): boolean => /color:\s*'error'/.test(block);

/**
 * Whether a destructive block's `message` names its target — a `t(key, { ... })` call, or a
 * `message` built from something other than a direct `t(...)` call (read as already-named).
 */
const namesItsTarget = (block: string): boolean =>
    !/message:\s*t\(/.test(block) || /message:\s*t\([^)]*,\s*{/.test(block);

describe('destructive confirms name their target', () => {
    it('interpolates the row into every color: "error" confirm outside the self-only allowlist', () => {
        const unnamed = componentFiles(SOURCE_ROOT).flatMap((file) => {
            const relative = path.relative(ROOT, file);
            if (SELF_ONLY_FILES.has(relative)) return [];

            return confirmBlocksOf(readFileSync(file, 'utf8'))
                .filter((block) => isDestructive(block) && !namesItsTarget(block))
                .map(() => relative);
        });

        // Named rather than counted: the failure has to say WHICH file, or fixing it is a
        // scavenger hunt through every module that renders a delete button.
        expect(unnamed).toEqual([]);
    });
});
