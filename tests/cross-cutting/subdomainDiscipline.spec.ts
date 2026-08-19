/**
 * Subdomain discipline: spend modelling effort where the business is, and nowhere else.
 *
 * DDD's own advice is the part most often skipped — tactical patterns belong in the **core**
 * domain, and supporting and generic subdomains should use the simplest thing that works. Every
 * module now says which of the three it is, and this file stops that being a label nobody acts on:
 *
 *   - a `generic` module may not carry a `domain/` folder. Auth screens, an ops console and a
 *     contact form are solved problems; a pure-rules layer inside one is effort spent on the part
 *     of the client that should stay replaceable.
 *
 * That rule, and the requirement that every module classify itself at all, is the whole of what
 * this file checks. Whether the classification stays HONEST is not checked. If every module drifts to `core` the
 * field stops being able to say no to anything, and nothing here will report it — that is a
 * review question now, not a failing test.
 *
 * There is deliberately no rule that a `core` module MUST have a `domain/` folder, and on a client
 * that matters more than it does on the server: **most of this application's domain lives behind
 * the API**. `cart` has one because quantity clamping is a real client-side rule; `products` and
 * `orders` are core and have none, because prices and status transitions are the server's to
 * decide and a second implementation here would be the drift `scripts/spec-identity.ts` exists to
 * catch. That is the correct state, not a gap — see `docs/theory/domain-layer.md`.
 */

import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enabledModules } from '@/modules';
import type { Subdomain } from '@/kernel/registry';

const MODULES_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/modules');

const withSubdomain = (subdomain: Subdomain): string[] =>
    enabledModules.filter((appModule) => appModule.subdomain === subdomain).map(({ name }) => name);

describe('subdomain classification', () => {
    it('classifies every enabled module', () => {
        const unclassified = enabledModules
            .filter((appModule) => !['core', 'supporting', 'generic'].includes(appModule.subdomain))
            .map(({ name }) => name);

        expect(unclassified).toEqual([]);
    });

    it('keeps a domain layer out of generic subdomains', () => {
        const misplaced = withSubdomain('generic').filter((name) =>
            existsSync(path.join(MODULES_ROOT, name, 'domain'))
        );

        expect(misplaced).toEqual([]);
    });
});
