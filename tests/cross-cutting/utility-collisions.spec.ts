/**
 * Vuetify and Tailwind both generate utility classes, and a name both generate resolves to
 * whichever layer comes later (`main.css`). This holds the set of names that mean something
 * different in each to the list in `scripts/design-policy.ts`, so a Vuetify or Tailwind upgrade
 * that adds a collision fails here, and so does a listed entry that stopped colliding.
 *
 * ── What each case guards ──────────────────────────────────────────────────────────────────
 * 1. Every collision is listed (`ambiguousUtilities`), and every listed entry still collides.
 * 2. No radius name collides: `main.css` gives Tailwind's scale Vuetify's values.
 * 3. `main.css` scans `src/` only (`source(none)`), so a doc that names a class cannot change
 *    the app's CSS.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import postcss from 'postcss';
import type { ChildNode } from 'postcss';
import { compile } from 'tailwindcss';
import { DESIGN_POLICY } from '../../scripts/design-policy';

/** The repo root (tests run from it). */
const ROOT = process.cwd();

/** Resolves `tailwindcss/*.css` and package imports from the repo's `node_modules`. */
const requireFromRoot = createRequire(path.join(ROOT, 'package.json'));

/** The Tailwind spacing step Vuetify's `ma-N` classes are written in pixels against. */
const REM = 16;

/** Declarations of a rule as `[property, value]`, comments and nested rules dropped. */
const declarationsOf = (nodes: ChildNode[] | undefined): [string, string][] =>
    (nodes ?? []).flatMap((node): [string, string][] =>
        node.type === 'decl' && !node.prop.startsWith('--tw-') ? [[node.prop, node.value]] : []
    );

/**
 * Rewrites a value to a common form: variables resolved, rem to px, `calc(px * n)` evaluated,
 * `thin` as 1px, colours lower case, a lone `flex-start`/`flex-end` as `start`/`end`.
 */
const normaliseValue = (raw: string, themeVariables: ReadonlyMap<string, string>): string =>
    raw
        // `--tw-border-style` is declared by Tailwind's `@property` with the initial value `solid`.
        .replaceAll('var(--tw-border-style)', 'solid')
        .replaceAll(
            /var\((--[\w-]+)\)/g,
            (whole, name: string) => themeVariables.get(name) ?? whole
        )
        .replaceAll(/(-?[\d.]+)rem/g, (_, rems: string) => `${Number(rems) * REM}px`)
        .replaceAll(
            /calc\((-?[\d.]+)px \* (-?[\d.]+)\)/g,
            (_, a: string, b: string) => `${Number(a) * Number(b)}px`
        )
        .replace(/^thin$/, '1px')
        .replace(/^flex-start$/, 'start')
        .replace(/^flex-end$/, 'end')
        .toLowerCase();

/**
 * Expands the logical `margin`/`padding` `-inline`/`-block` shorthands Tailwind writes into the
 * physical sides Vuetify writes, so the two compare property by property.
 */
const expandProperty = (rawProp: string, value: string): [string, string][] => {
    // Vuetify writes a border side logically (`border-block-start-*`), Tailwind physically.
    const prop = rawProp.startsWith('border-')
        ? rawProp
              .replace('-block-start', '-top')
              .replace('-block-end', '-bottom')
              .replace('-inline-start', '-left')
              .replace('-inline-end', '-right')
        : rawProp;
    const match = /^(margin|padding)-(inline|block)$/.exec(prop);
    if (match?.[1] === undefined) return [[prop, value]];
    const sides = match[2] === 'inline' ? ['right', 'left'] : ['top', 'bottom'];
    return sides.map((side): [string, string] => [`${match[1]}-${side}`, value]);
};

/** A rule's declarations as a property-to-value map, normalised. */
const normalise = (
    nodes: ChildNode[] | undefined,
    themeVariables: ReadonlyMap<string, string>
): Map<string, string> =>
    new Map(
        declarationsOf(nodes)
            .flatMap(([prop, value]) => expandProperty(prop, value))
            .map(([prop, value]): [string, string] => [
                prop,
                // Tailwind writes an opacity as a percentage, Vuetify as a fraction.
                normaliseValue(value, themeVariables)
                    .replace(/^0(?:px)?$/, '0')
                    .replace(/^(\d+)%$/, (whole, n: string) =>
                        prop === 'opacity' ? String(Number(n) / 100) : whole
                    )
            ])
    );

/** Single-class rules of Vuetify's utility layers, by class name. */
const vuetifyUtilities = (): Map<string, ChildNode[]> => {
    const css = readFileSync(path.join(ROOT, 'node_modules/vuetify/dist/vuetify.css'), 'utf8');
    const found = new Map<string, ChildNode[]>();
    postcss.parse(css).walkAtRules('layer', (layer) => {
        if (!layer.params.startsWith('vuetify-utilities')) return;
        layer.each((node) => {
            if (node.type !== 'rule') return;
            const name = /^\.([\w-]+)$/.exec(node.selector)?.[1];
            if (name !== undefined) found.set(name, node.nodes);
        });
    });
    return found;
};

/**
 * Compiles `main.css` with Tailwind and builds every candidate class, returning the rules it
 * generated by class name plus the theme variables the build declared.
 * https://tailwindcss.com/docs/compatibility — `compile()` is Tailwind v4's public JS API.
 */
const tailwindBuild = async (candidates: string[]) => {
    const css = readFileSync(path.join(ROOT, 'src/styles/main.css'), 'utf8');
    const compiler = await compile(css, {
        base: path.join(ROOT, 'src/styles'),
        // `@import 'tailwindcss/utilities.css'` resolves from node_modules, like Vite would.
        loadStylesheet: (id, base) => {
            const resolved = requireFromRoot.resolve(id, { paths: [base] });
            return Promise.resolve({
                path: resolved,
                base: path.dirname(resolved),
                content: readFileSync(resolved, 'utf8')
            });
        }
    });
    const built = postcss.parse(compiler.build(candidates));
    const themeVariables = new Map<string, string>();
    const rules = new Map<string, ChildNode[]>();
    built.walkRules((rule) => {
        if (rule.selector.startsWith(':root'))
            rule.walkDecls(/^--/, (decl) => void themeVariables.set(decl.prop, decl.value));
        const name = /^\.([\w\\-]+)$/.exec(rule.selector)?.[1]?.replaceAll('\\', '');
        if (name !== undefined) rules.set(name, rule.nodes);
    });
    return { rules, themeVariables };
};

/**
 * Whether the two libraries disagree about a class: a property both set with different values,
 * or no property in common at all (the name means two different things).
 */
const collides = (vuetify: Map<string, string>, tailwind: Map<string, string>): boolean => {
    const shared = [...vuetify.keys()].filter((prop) => tailwind.has(prop));
    if (shared.length === 0) return true;
    return shared.some((prop) => vuetify.get(prop) !== tailwind.get(prop));
};

/** The class names where the libraries disagree, measured now. */
const measuredCollisions = async (): Promise<string[]> => {
    const vuetify = vuetifyUtilities();
    const { rules, themeVariables } = await tailwindBuild([...vuetify.keys()]);
    return [...rules.keys()]
        .filter((name) => vuetify.has(name))
        .filter((name) =>
            collides(
                normalise(vuetify.get(name), themeVariables),
                normalise(rules.get(name), themeVariables)
            )
        )
        .toSorted();
};

describe('utility class collisions', () => {
    it('lists every name Vuetify and Tailwind disagree about, and nothing else', async () => {
        const collisions = await measuredCollisions();
        const listed = DESIGN_POLICY.ambiguousUtilities.map((entry) => new RegExp(entry.pattern));
        expect(
            collisions.filter((name) => !listed.some((pattern) => pattern.test(name))),
            'a collision nobody listed: add it to ambiguousUtilities in scripts/design-policy.ts'
        ).toEqual([]);
        expect(
            listed.filter((pattern) => !collisions.some((name) => pattern.test(name))),
            'a listed entry that no longer collides: delete it from ambiguousUtilities'
        ).toEqual([]);
    });

    it('has no radius name that means two things', async () => {
        const collisions = await measuredCollisions();
        expect(collisions.filter((name) => name.startsWith('rounded'))).toEqual([]);
    });

    it('lets Tailwind scan src/ only', () => {
        const css = readFileSync(path.join(ROOT, 'src/styles/main.css'), 'utf8');
        expect(css).toMatch(/@import\s+'tailwindcss\/utilities\.css'[^;]*source\(none\)/);
        expect(css).toMatch(/@source\s+'\.\.\/'/);
    });
});
