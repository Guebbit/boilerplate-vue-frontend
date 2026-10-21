/**
 * @module
 * The invasive-CSS scanner: every automated check behind `npm run audit:css` and
 * `tests/cross-cutting/css-invasiveness.spec.ts`, in one module so they share one ratchet.
 *
 * Three readers feed one list of findings:
 * - CSS (`main.css`, SFC `<style>`, the `index.html` splash), parsed with PostCSS and
 *   postcss-selector-parser, one finding per rule and check;
 * - SFC templates, parsed with `vue/compiler-sfc`, one finding per element and check;
 * - scripts under `src/`, read as text.
 *
 * The template checks live here rather than in ESLint on purpose: an ESLint error cannot be
 * frozen in a baseline without a disable on every known line, and the ratchet needs exactly that
 * — today's hits listed, new ones refused, fixed ones struck off.
 *
 * A `css-allow <check> -- <why>` comment right before a node covers that node for that one check.
 * An allowance that covers nothing, or has no reason, is a finding of its own.
 * Theory: `docs/theory/design-system.md`; usage: `docs/tools/design-lint.md`.
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import type { AtRule, Comment, Declaration, Root, Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { babelParse, parse as parseSfc } from 'vue/compiler-sfc';
import {
    cssSources,
    documentCssSources,
    insideTheme,
    readRoot,
    ROOT,
    vueFiles,
    type CssSource
} from '../../css-sources';
import { DESIGN_POLICY, themeColorNames, type VuetifyPropUtility } from '../../design-policy';
import { tailwindBuilder } from '../../tailwind-build';

/**
 * What a check is called in a report, and the fix it suggests.
 */
export interface CheckInfo {
    /** One line: what the check refuses. */
    title: string;
    /** The route out, in the order of resort (prop → defaults → theme → allowance). */
    fix: string;
}

/** Every check, by id. The ids follow stylelint's rule names where one exists. */
export const CHECKS = {
    'vuetify-internal': {
        title: "A selector reaches into a Vuetify class (`.v-*`), or into a child's elements through `:deep()`.",
        fix: 'Use a prop, a `createVuetify({ defaults })` entry or a theme `variables` key; only then a `css-allow`.'
    },
    deep: {
        title: '`:deep()` reaches into a child component.',
        fix: 'Own child: give it a prop or a slot class. Vuetify child: a prop, a slot or `defaults`.'
    },
    'vuetify-variable': {
        title: 'A declaration or a class sets a `--v-*` custom property.',
        fix: 'Set it in the theme `variables` (`src/ui/vuetify/theme.ts`) or through the component prop that owns it.'
    },
    important: {
        title: '`!important` in CSS.',
        fix: 'Put the rule in a cascade layer after the one it must beat, or use the prop that owns the value.'
    },
    'max-specificity': {
        title: 'A selector above the specificity ceiling (`cssInvasiveness.maxSpecificity`).',
        fix: 'Style our own element with one class, or move the style into the template as utilities.'
    },
    'max-compound': {
        title: 'A selector with too many compound selectors (`cssInvasiveness.maxCompound`).',
        fix: 'Put a class on the element you mean instead of walking the tree to it.'
    },
    'scoped-type-selector': {
        title: 'A bare element selector in a scoped block (slow, and it leaks into recursion).',
        fix: 'Give the element a class.'
    },
    'z-index': {
        title: 'A raw `z-index` above local stacking.',
        fix: 'Name it as a `--z-index-*` token in `@theme` (`src/styles/main.css`) and read `var(--z-index-…)`.'
    },
    'magic-length': {
        title: 'A px length, or a rem off the spacing scale, on a spacing or sizing property.',
        fix: 'Use the scale (`calc(var(--spacing) * N)`) or a named token in `@theme`.'
    },
    'utility-redefinition': {
        title: 'A selector targets a class Tailwind generates, so the utility silently changes meaning.',
        fix: 'Add a named token or an `@utility`, and use that name where the changed value is wanted.'
    },
    'block-size': {
        title: 'An SFC `<style>` block over `cssInvasiveness.maxScopedDeclarations` declarations.',
        fix: 'Move the styling to utilities and props; keep only what has no class.'
    },
    'vuetify-root-override': {
        title: 'A scoped rule restyles a Vuetify component through a class set on its tag.',
        fix: 'Use the component prop that owns the property (`opacity`, `lines`, `tile`, …) or a theme `variables` key.'
    },
    'unit-disallowed-list': {
        title: 'A declaration uses a disallowed unit (`vh`: the mobile address bar makes it overflow).',
        fix: 'Use `dvh` (or `svh`/`lvh`), which tracks the visible viewport.'
    },
    'duplicate-in-rule': {
        title: 'The same property twice in one rule.',
        fix: 'Delete the dead declaration.'
    },
    'repeated-custom-property': {
        title: 'The same custom-property declaration in more than one SFC `<style>` block.',
        fix: 'A value used twice is a token or a shared class in `src/styles/main.css`, or a prop.'
    },
    'vuetify-prop-first': {
        title: 'A utility class on a Vuetify component duplicates one of its props.',
        fix: 'Use the prop named in the snippet.'
    },
    'tailwind-important': {
        title: 'The Tailwind important modifier (`!class` / `class!`).',
        fix: 'Find the rule it fights and solve the specificity there: a prop, a layer, or a variant.'
    },
    'vuetify-arbitrary-variant': {
        title: 'A Tailwind arbitrary variant that reaches into a Vuetify class (`[&_.v-x]:`).',
        fix: 'Use a prop, a slot or `defaults` on the inner component.'
    },
    'native-title': {
        title: 'A native `title` attribute: information a finger cannot reach.',
        fix: 'Show it visibly (a subline, a legend, a caption), or drop it when it only repeats the accessible name.'
    },
    'vuetify-dom-query': {
        title: 'A script queries the DOM by a Vuetify class.',
        fix: 'Query our own hook (`data-test`, a ref, a class we own) instead of Vuetify markup.'
    },
    'stale-allowance': {
        title: 'A `css-allow` that covers nothing: the check no longer fires there.',
        fix: 'Delete the allowance.'
    },
    'bad-allowance': {
        title: 'A `css-allow` without a known check, a reason, or a single element.',
        fix: 'Write `css-allow <check> -- <why>`, one check, before one rule or element naming one Vuetify part.'
    }
} as const satisfies Record<string, CheckInfo>;

/** The id of one check. */
export type CheckId = keyof typeof CHECKS;

/**
 * One hit, as the report and the ratchet see it.
 */
export interface CssFinding {
    /** The file, relative to the repo root. */
    file: string;
    /** The 1-based line in that file. */
    line: number;
    /** Which check fired. */
    check: CheckId;
    /** A stable handle (selector, tag + class, call): the ratchet's key, never a line number. */
    anchor: string;
    /** What fired, for the reader. */
    snippet: string;
    /** The suggested fix. */
    fix: string;
}

/**
 * A hit before allowances apply: a finding plus the node it belongs to.
 */
interface RawHit extends CssFinding {
    /** The covered node's id (`file:line[:column]`); an allowance names the same id. */
    target: string;
}

/**
 * One `css-allow` comment.
 */
interface Allowance {
    /** The file it sits in. */
    file: string;
    /** Its line. */
    line: number;
    /** The comment text, trimmed. */
    text: string;
    /** The check it names, when it names a known one. */
    check: CheckId | undefined;
    /** Why the allowance is invalid, if it is. */
    problem: string | undefined;
    /** The node it covers, if any. */
    target: string | undefined;
}

/** What a reader returns for one file. */
interface Scan {
    /** Every hit, allowances not yet applied. */
    hits: RawHit[];
    /** Every `css-allow` comment. */
    allowances: Allowance[];
}

/** `css-allow <check> -- <reason>`. */
export const ALLOWANCE_GRAMMAR = /^css-allow\s+(\S+)\s+--\s+(\S.*)$/s;

/** The knobs. */
const KNOBS = DESIGN_POLICY.cssInvasiveness;

/** The utility → prop routes, widened to their interface. */
const PROP_ROUTES: readonly VuetifyPropUtility[] = DESIGN_POLICY.vuetifyPropUtilities;

/**
 * Builds a finding with the check's default fix.
 *
 * @param hit - Everything but the fix, plus an optional specific one.
 * @returns The raw hit.
 */
const hitOf = (hit: Omit<RawHit, 'fix'> & { fix?: string }): RawHit => ({
    ...hit,
    fix: hit.fix ?? CHECKS[hit.check].fix
});

/** Collapses whitespace runs, so an anchor survives reformatting. */
const squash = (text: string): string => text.replaceAll(/\s+/g, ' ').trim();

/**
 * Parses the text of a comment that starts with `css-allow`.
 *
 * @param file - Where the comment sits.
 * @param line - Its line.
 * @param raw - The comment text.
 * @param target - The node it covers.
 * @returns The allowance, or `undefined` when the comment is not one.
 */
export const parseAllowance = (
    file: string,
    line: number,
    raw: string,
    target: string | undefined
): Allowance | undefined => {
    const text = squash(raw);
    if (!text.startsWith('css-allow')) return undefined;
    const match = ALLOWANCE_GRAMMAR.exec(text);
    const name = match?.[1] ?? '';
    const check = Object.hasOwn(CHECKS, name) ? (name as CheckId) : undefined;
    let problem: string | undefined;
    if (match === null) problem = 'expected `css-allow <check> -- <why>`';
    else if (check === undefined) problem = `unknown check \`${name}\``;
    return { file, line, text, check, problem, target };
};

// ── CSS ───────────────────────────────────────────────────────────────────────────────────────

/** A `[id, class, type]` specificity triple. */
type Specificity = readonly [number, number, number];

/** The neutral specificity. */
const ZERO: Specificity = [0, 0, 0];

/** Vue's scope escapes: each counts as its argument. */
const PASS_THROUGH = new Set([':deep', '::v-deep', ':v-deep', ':slotted', ':global']);

/** Logical pseudo-classes that count their most specific argument. */
const MOST_SPECIFIC_ARGUMENT = new Set([':is', ':not', ':has', ':matches']);

/** CSS2 pseudo-elements still written with one colon. */
const LEGACY_PSEUDO_ELEMENTS = new Set([':before', ':after', ':first-line', ':first-letter']);

/** Vue's deep selector, in every spelling. */
const isDeep = (node: selectorParser.Node): node is selectorParser.Pseudo =>
    selectorParser.isPseudo(node) && [':deep', '::v-deep', ':v-deep'].includes(node.value);

/** Adds two specificities. */
const add = (a: Specificity, b: Specificity): Specificity => [
    a[0] + b[0],
    a[1] + b[1],
    a[2] + b[2]
];

/** Whether `a` is more specific than `b`. */
const above = (a: Specificity, b: Specificity): boolean => {
    const index = a.findIndex((value, at) => value !== b[at]);
    return index !== -1 && (a[index] ?? 0) > (b[index] ?? 0);
};

/** The most specific of a pseudo's argument selectors. */
const maxOf = (selectors: selectorParser.Selector[]): Specificity => {
    let best = ZERO;
    for (const selector of selectors) {
        const next = specificityOf(selector.nodes);
        if (above(next, best)) best = next;
    }
    return best;
};

/**
 * The specificity one selector node adds, per Selectors Level 4.
 *
 * @param node - A node of a parsed selector.
 * @returns Its `[id, class, type]` contribution.
 */
const nodeSpecificity = (node: selectorParser.Node): Specificity => {
    if (node.type === 'id') return [1, 0, 0];
    if (node.type === 'class' || node.type === 'attribute') return [0, 1, 0];
    if (node.type === 'tag') return [0, 0, 1];
    if (!selectorParser.isPseudo(node)) return ZERO;
    const name = node.value.toLowerCase();
    if (name === ':where') return ZERO;
    if (PASS_THROUGH.has(name) || MOST_SPECIFIC_ARGUMENT.has(name)) return maxOf(node.nodes);
    if (name.startsWith('::') || LEGACY_PSEUDO_ELEMENTS.has(name)) return [0, 0, 1];
    return [0, 1, 0];
};

/**
 * The specificity of a sequence of selector nodes.
 *
 * @param nodes - The nodes of one selector.
 * @returns The summed specificity.
 */
export const specificityOf = (nodes: selectorParser.Node[]): Specificity => {
    let sum = ZERO;
    for (const node of nodes) sum = add(sum, nodeSpecificity(node));
    return sum;
};

/**
 * Splits a selector into its compound selectors, the `:deep()` pseudos set aside.
 *
 * @param nodes - The nodes of one selector.
 * @returns The compounds (each a list of nodes) and the deep pseudos.
 */
const compoundsOf = (
    nodes: selectorParser.Node[]
): { compounds: selectorParser.Node[][]; deeps: selectorParser.Pseudo[] } => {
    const compounds: selectorParser.Node[][] = [[]];
    const deeps: selectorParser.Pseudo[] = [];
    for (const node of nodes) {
        if (isDeep(node)) deeps.push(node);
        else if (node.type === 'combinator') compounds.push([]);
        else compounds.at(-1)?.push(node);
    }
    return { compounds: compounds.filter((compound) => compound.length > 0), deeps };
};

/**
 * The number of compound selectors, counting into `:deep()` as if it were a combinator.
 *
 * @param nodes - The nodes of one selector.
 * @returns The compound count.
 */
export const compoundCount = (nodes: selectorParser.Node[]): number => {
    const { compounds, deeps } = compoundsOf(nodes);
    const inner = deeps.map((deep) =>
        Math.max(0, ...deep.nodes.map((selector) => compoundCount(selector.nodes)))
    );
    return compounds.length + inner.reduce((sum, count) => sum + count, 0);
};

/** Whether a compound is a bare element: a tag and no class, id or attribute. */
const isBareElement = (compound: selectorParser.Node[]): boolean =>
    compound.some((node) => node.type === 'tag') &&
    !compound.some((node) => ['class', 'id', 'attribute'].includes(node.type));

/**
 * Whether a `:deep()` argument names a bare element (`td`, `input::placeholder`): it reaches into
 * a child's markup, and for a Vuetify child that markup is Vuetify's.
 */
const deepReachesElement = (selector: selectorParser.Selector): boolean =>
    compoundsOf(selector.nodes).deeps.some((deep) =>
        deep.nodes.some((argument) =>
            compoundsOf(argument.nodes).compounds.some((compound) => isBareElement(compound))
        )
    );

/** Every class name a selector names, `:deep()` and `:is()` arguments included. */
const classesOf = (selector: selectorParser.Selector): string[] => {
    const names: string[] = [];
    selector.walkClasses((node) => {
        names.push(node.value);
    });
    return names;
};

/** Whether a selector uses Vue's deep escape (pseudo or legacy combinator). */
const usesDeep = (selector: selectorParser.Selector): boolean => {
    let found = false;
    selector.walk((node) => {
        if (isDeep(node) || (node.type === 'combinator' && /^(?:>>>|\/deep\/)$/.test(node.value)))
            found = true;
    });
    return found;
};

/**
 * What a rule-level check needs to know about where the rule sits.
 */
interface RuleContext {
    /** The source the rule came from. */
    source: CssSource;
    /** Class names Tailwind generates, from the app's own CSS candidates. */
    utilities: ReadonlySet<string>;
}

/** A check over one rule: the offending pieces, empty when the rule passes. */
type RuleCheck = (
    rule: Rule,
    selectors: selectorParser.Selector[],
    context: RuleContext
) => string[];

/** The rule's own declarations. */
const declsOf = (rule: Rule): Declaration[] =>
    rule.nodes.filter((node): node is Declaration => node.type === 'decl');

/** A declaration as written, for a snippet. */
const declText = (decl: Declaration): string =>
    `${decl.prop}: ${decl.value}${decl.important ? ' !important' : ''}`;

/** Whether a `z-index` value is local stacking, a token, or a keyword. */
const isAllowedZIndex = (value: string): boolean => {
    if (/^var\(--z-index-[\w-]+\)$/.test(value.trim())) return true;
    if (/^(?:auto|inherit|initial|unset|revert|revert-layer)$/.test(value.trim())) return true;
    const number = Number(value);
    return Number.isInteger(number) && number >= -1 && number <= KNOBS.localZIndexMax;
};

/** Spacing and sizing properties, where a length should come from the scale. */
const LENGTH_PROPERTY =
    /^(?:(?:min-|max-)?(?:width|height|inline-size|block-size)|inset(?:-.+)?|top|right|bottom|left|margin(?:-.+)?|padding(?:-.+)?|gap|row-gap|column-gap|font-size)$/;

/** Removes every `var(…)`, fallbacks included: a fallback is not the value the app uses. */
const withoutVariables = (value: string): string => {
    const stripped = value.replaceAll(/var\([^()]*\)/g, '');
    return stripped === value ? value : withoutVariables(stripped);
};

/**
 * The lengths in a value that are off the scale: any non-zero px, or a rem that is not a
 * multiple of the spacing step.
 *
 * @param value - A declaration value.
 * @returns The offending lengths as written.
 */
export const magicLengths = (value: string): string[] =>
    [...withoutVariables(value).matchAll(/(-?\d*\.?\d+)(px|rem)\b/g)]
        .filter(([, amount, unit]) => {
            const number = Math.abs(Number(amount));
            if (number === 0) return false;
            if (unit === 'px') return true;
            return (
                Math.abs(number / KNOBS.spacingRem - Math.round(number / KNOBS.spacingRem)) > 1e-9
            );
        })
        .map(([whole]) => whole);

/**
 * Whether a value uses a unit, as a number followed by exactly that unit (`dvh` is not `vh`).
 *
 * @param value - A declaration value.
 * @param unit - The unit, e.g. `vh`.
 * @returns Whether the value holds a number in that unit.
 */
const hasUnit = (value: string, unit: string): boolean =>
    new RegExp(String.raw`(?<![\w-])\d*\.?\d+${unit}\b`).test(value);

/** The rule-level checks, by id. */
const RULE_CHECKS: readonly (readonly [CheckId, RuleCheck])[] = [
    [
        'vuetify-internal',
        (_rule, selectors) =>
            selectors
                .filter(
                    (selector) =>
                        classesOf(selector).some((name) => name.startsWith('v-')) ||
                        deepReachesElement(selector)
                )
                .map(String)
    ],
    ['deep', (_rule, selectors) => selectors.filter((selector) => usesDeep(selector)).map(String)],
    [
        'max-specificity',
        (_rule, selectors) =>
            selectors
                .filter((selector) => above(specificityOf(selector.nodes), KNOBS.maxSpecificity))
                .map(
                    (selector) => `${String(selector)} (${specificityOf(selector.nodes).join(',')})`
                )
    ],
    [
        'max-compound',
        (_rule, selectors) =>
            selectors
                .filter((selector) => compoundCount(selector.nodes) > KNOBS.maxCompound)
                .map(String)
    ],
    [
        'scoped-type-selector',
        (_rule, selectors, { source }) =>
            source.scoped
                ? selectors
                      .filter((selector) =>
                          compoundsOf(selector.nodes).compounds.some((compound) =>
                              isBareElement(compound)
                          )
                      )
                      .map(String)
                : []
    ],
    [
        'utility-redefinition',
        (_rule, selectors, { utilities }) =>
            selectors
                .filter((selector) => classesOf(selector).some((name) => utilities.has(name)))
                .map(String)
    ],
    [
        'vuetify-variable',
        (rule) =>
            declsOf(rule)
                .filter((decl) => decl.prop.startsWith('--v-'))
                .map((decl) => declText(decl))
    ],
    [
        'important',
        (rule) =>
            declsOf(rule)
                .filter((decl) => decl.important)
                .map((decl) => declText(decl))
    ],
    [
        'z-index',
        (rule) =>
            declsOf(rule)
                .filter((decl) => decl.prop === 'z-index' && !isAllowedZIndex(decl.value))
                .map((decl) => declText(decl))
    ],
    [
        'magic-length',
        (rule) =>
            declsOf(rule)
                .filter(
                    (decl) => LENGTH_PROPERTY.test(decl.prop) && magicLengths(decl.value).length > 0
                )
                .map((decl) => declText(decl))
    ],
    [
        'unit-disallowed-list',
        (rule) =>
            declsOf(rule)
                .filter((decl) => KNOBS.disallowedUnits.some((unit) => hasUnit(decl.value, unit)))
                .map((decl) => declText(decl))
    ],
    [
        'duplicate-in-rule',
        (rule) =>
            declsOf(rule)
                .filter(
                    (decl, index, all) =>
                        all.findIndex((other) => other.prop === decl.prop) !== index
                )
                .map((decl) => declText(decl))
    ]
];

/** The file line of a PostCSS node. */
const lineOf = (source: CssSource, node: { source?: { start?: { line: number } } }): number =>
    source.firstLine + (node.source?.start?.line ?? 1) - 1;

/** Whether a rule is inside `@theme` or `@keyframes`, where none of the checks apply. */
const isExempt = (rule: Rule): boolean =>
    insideTheme(rule) || (rule.parent?.type === 'atrule' && rule.parent.name.endsWith('keyframes'));

/** The id of a rule, as a `css-allow` before it names it. */
const ruleTarget = (source: CssSource, rule: Rule): string =>
    `${source.file}:${String(lineOf(source, rule))}`;

/** The id of a whole SFC style block (for `block-size`). */
const blockTarget = (source: CssSource): string =>
    `${source.file}:${String(source.firstLine)}:block`;

/**
 * Every hit of every rule-level check on one rule.
 *
 * @param rule - The rule.
 * @param context - Its source and the Tailwind utility names.
 * @returns The raw hits.
 */
const ruleHits = (rule: Rule, context: RuleContext): RawHit[] => {
    const selectors = selectorParser().astSync(rule.selector).nodes;
    return RULE_CHECKS.flatMap(([check, run]) => {
        const pieces = run(rule, selectors, context).map((piece) => squash(piece));
        if (pieces.length === 0) return [];
        return [
            hitOf({
                file: context.source.file,
                line: lineOf(context.source, rule),
                check,
                anchor: squash(rule.selector),
                snippet: pieces.join(' · '),
                target: ruleTarget(context.source, rule)
            })
        ];
    });
};

/** The rule a comment sits right before, comments in between skipped. */
const ruleAfter = (comment: Comment): Rule | undefined => {
    let next = comment.next();
    while (next?.type === 'comment') next = next.next();
    return next?.type === 'rule' ? next : undefined;
};

/**
 * The `css-allow` comments of one source, each pointed at the node it covers.
 *
 * @param source - The CSS source.
 * @param root - Its parsed tree.
 * @returns The allowances.
 */
const cssAllowances = (source: CssSource, root: Root): Allowance[] => {
    const found: Allowance[] = [];
    root.walkComments((comment) => {
        const rule = ruleAfter(comment);
        const target = rule === undefined ? undefined : ruleTarget(source, rule);
        const allowance = parseAllowance(
            source.file,
            lineOf(source, comment),
            comment.text,
            target
        );
        if (allowance === undefined) return;
        found.push(
            allowance.check === 'block-size' && comment.parent === root
                ? { ...allowance, target: blockTarget(source) }
                : allowance
        );
    });
    return found;
};

/** The `block-size` hit of an SFC style block, if it is over the limit. */
const blockSizeHits = (source: CssSource, root: Root): RawHit[] => {
    let count = 0;
    root.walkDecls(() => {
        count += 1;
    });
    if (!source.sfc || count <= KNOBS.maxScopedDeclarations) return [];
    return [
        hitOf({
            file: source.file,
            line: source.firstLine,
            check: 'block-size',
            anchor: source.scoped ? '<style scoped>' : '<style>',
            snippet: `${String(count)} declarations`,
            target: blockTarget(source)
        })
    ];
};

/**
 * One custom-property declaration in an SFC, for the cross-file repeat check.
 */
interface CustomProperty {
    /** The source it sits in. */
    source: CssSource;
    /** The declaration. */
    decl: Declaration;
}

/** Every custom-property declaration of the SFC sources, outside `@theme`. */
const customProperties = (parsed: { source: CssSource; root: Root }[]): CustomProperty[] =>
    parsed
        .filter(({ source }) => source.sfc)
        .flatMap(({ source, root }) => {
            const found: CustomProperty[] = [];
            root.walkDecls(/^--/, (decl) => {
                if (!insideTheme(decl)) found.push({ source, decl });
            });
            return found;
        });

/** A custom-property declaration as a comparable string. */
const declarationKey = ({ decl }: CustomProperty): string => squash(declText(decl));

/**
 * The `repeated-custom-property` hits: one per occurrence of a declaration found in two files.
 *
 * @param parsed - Every parsed source.
 * @returns The raw hits.
 */
const repeatHits = (parsed: { source: CssSource; root: Root }[]): RawHit[] => {
    const all = customProperties(parsed);
    return all
        .filter(
            (entry) =>
                new Set(
                    all
                        .filter((other) => declarationKey(other) === declarationKey(entry))
                        .map((other) => other.source.file)
                ).size > 1
        )
        .map(({ source, decl }) => {
            const rule = decl.parent as Rule;
            return hitOf({
                file: source.file,
                line: lineOf(source, decl),
                check: 'repeated-custom-property',
                anchor: `${squash(rule.selector)} { ${declarationKey({ source, decl })} }`,
                snippet: declarationKey({ source, decl }),
                target: ruleTarget(source, rule)
            });
        });
};

/** Every class name the rules under a node name in their selectors. */
const classesIn = (container: Root | AtRule): string[] => {
    const names: string[] = [];
    container.walkRules((rule) => {
        names.push(
            ...selectorParser()
                .astSync(rule.selector)
                .nodes.flatMap((selector) => classesOf(selector))
        );
    });
    return names;
};

/**
 * The class names Tailwind generates among the ones the app's CSS names: only rules inside
 * `@layer utilities` count, so the app's own unlayered classes are not mistaken for utilities.
 *
 * @param parsed - Every parsed source.
 * @returns The generated class names.
 */
const tailwindUtilities = async (parsed: { root: Root }[]): Promise<Set<string>> => {
    const candidates = new Set(parsed.flatMap(({ root }) => classesIn(root)));
    const build = await tailwindBuilder();
    const generated = new Set<string>();
    postcss.parse(build([...candidates])).walkAtRules('layer', (layer) => {
        if (layer.params === 'utilities') for (const name of classesIn(layer)) generated.add(name);
    });
    return generated;
};

/**
 * Every CSS hit and allowance across the app's CSS sources.
 *
 * @param sources - The sources; defaults to `main.css`, every SFC block and the splash.
 * @returns The raw scan.
 */
export const scanCss = async (
    sources: CssSource[] = [...cssSources(), ...documentCssSources()]
): Promise<Scan> => {
    const parsed = sources.map((source) => ({ source, root: postcss.parse(source.css) }));
    const utilities = await tailwindUtilities(parsed);
    const hits = parsed.flatMap(({ source, root }) => {
        const found: RawHit[] = [];
        root.walkRules((rule) => {
            if (!isExempt(rule)) found.push(...ruleHits(rule, { source, utilities }));
        });
        return [...found, ...blockSizeHits(source, root)];
    });
    return {
        hits: [...hits, ...repeatHits(parsed)],
        allowances: parsed.flatMap(({ source, root }) => cssAllowances(source, root))
    };
};

// ── Templates ─────────────────────────────────────────────────────────────────────────────────

/** `vue/compiler-core` node types this reader uses (`NodeTypes`). */
const NODE = { element: 1, text: 2, comment: 3, attribute: 6, directive: 7 } as const;

/**
 * The slice of a compiler-core template node the checks read.
 */
interface TemplateNode {
    /** The `NodeTypes` value. */
    type: number;
    /** An element's tag, as written. */
    tag?: string;
    /** A comment's or text's content. */
    content?: string;
    /** An element's attributes and directives. */
    props?: TemplateProp[];
    /** An element's children. */
    children?: TemplateNode[];
    /** Class tokens read out of its `:class` binding, filled in by {@link scanTemplate}. */
    dynamicTokens?: string[];
    /** Where the node starts. */
    loc: { start: { line: number; column: number }; source: string };
}

/**
 * The slice of a compiler-core attribute or directive the checks read.
 */
interface TemplateProp {
    /** `NodeTypes.ATTRIBUTE` or `NodeTypes.DIRECTIVE`. */
    type: number;
    /** The attribute name, or the directive name (`bind`). */
    name: string;
    /** A static attribute's value. */
    value?: { content: string };
    /** A directive's argument (`title` in `:title`). */
    arg?: { content?: string };
    /** A directive's expression. */
    exp?: { content?: string };
    /** Where the attribute starts. */
    loc: { start: { line: number } };
}

/** Whether an unknown value is a template node. */
const isTemplateNode = (value: unknown): value is TemplateNode =>
    typeof value === 'object' && value !== null && 'type' in value && 'loc' in value;

/** The template children of a node, typed. */
const childrenOf = (node: TemplateNode): TemplateNode[] =>
    (node.children ?? []).filter((child) => isTemplateNode(child));

/** Vuetify's props, per component (`VBtn` → `min-height`, …), from its shipped web-types. */
const vuetifyProps = (): Map<string, Set<string>> => {
    const attributes = JSON.parse(
        readFileSync(path.join(ROOT, 'node_modules/vuetify/dist/json/attributes.json'), 'utf8')
    ) as Record<string, unknown>;
    const props = new Map<string, Set<string>>();
    for (const key of Object.keys(attributes)) {
        const [component = '', prop = ''] = key.split('/');
        props.set(component, (props.get(component) ?? new Set<string>()).add(prop));
    }
    return props;
};

/** The Vuetify component a tag names (`v-btn` and `VBtn` → `VBtn`), or `undefined`. */
const vuetifyComponent = (tag: string): string | undefined => {
    if (/^V[A-Z]/.test(tag)) return tag;
    if (!tag.startsWith('v-')) return undefined;
    return tag.replaceAll(/(?:^|-)([a-z])/g, (_, letter: string) => letter.toUpperCase());
};

/** Vue's built-in tags: lower case, but not HTML elements. */
const VUE_BUILTINS = new Set([
    'component',
    'slot',
    'template',
    'transition',
    'keep-alive',
    'teleport',
    'suspense'
]);

/**
 * What a template check needs besides the element.
 */
interface TemplateContext {
    /** Vuetify's props per component. */
    props: ReadonlyMap<string, ReadonlySet<string>>;
    /** The theme colour names. */
    colors: ReadonlySet<string>;
}

/** A static attribute's value, or `undefined`. */
const staticAttribute = (node: TemplateNode, name: string): string | undefined =>
    node.props?.find((prop) => prop.type === NODE.attribute && prop.name === name)?.value?.content;

/** The `title` attribute or `:title` binding of an element, if any. */
const titleAttribute = (node: TemplateNode): TemplateProp | undefined =>
    node.props?.find(
        (prop) =>
            (prop.type === NODE.attribute && prop.name === 'title') ||
            (prop.type === NODE.directive && prop.name === 'bind' && prop.arg?.content === 'title')
    );

/** The static class tokens of an element, plus the ones its `:class` binding can produce. */
const classTokens = (node: TemplateNode): string[] => [
    ...(staticAttribute(node, 'class') ?? '').split(/\s+/).filter(Boolean),
    ...(node.dynamicTokens ?? [])
];

/**
 * What a `:class` expression or a script binding contributes: its string literals, the static
 * parts of its template literals, and the identifiers it names.
 */
interface ClassSource {
    /** Literal text found in it. */
    strings: string[];
    /** Identifiers found in it, to be looked up in the script. */
    names: string[];
}

/**
 * Collects the string literals and identifiers anywhere in a Babel AST.
 *
 * @param node - Any AST node, or a plain value inside one.
 * @returns The literals and identifier names found.
 */
const classSourceOf = (node: unknown): ClassSource => {
    const found: ClassSource = { strings: [], names: [] };
    const visit = (value: unknown): void => {
        if (Array.isArray(value)) {
            for (const item of value) visit(item);
            return;
        }
        if (typeof value !== 'object' || value === null) return;
        const record = value as Record<string, unknown>;
        if (record.type === 'StringLiteral') found.strings.push(record.value as string);
        if (record.type === 'TemplateElement')
            found.strings.push((record.value as { cooked?: string }).cooked ?? '');
        if (record.type === 'Identifier') found.names.push(String(record.name));
        for (const [key, child] of Object.entries(record))
            if (key !== 'loc' && key !== 'extra') visit(child);
    };
    visit(node);
    return found;
};

/** Class tokens (whitespace split) out of a list of literals. */
const tokensOf = (strings: string[]): string[] =>
    strings.flatMap((text) => text.split(/\s+/)).filter(Boolean);

/**
 * The top-level `<script setup>` bindings of an SFC and what their initialisers hold, so a
 * `:class="accentClass"` can be followed to the strings behind it.
 *
 * @param script - The `<script setup>` source, or `undefined`.
 * @returns The class source per binding name.
 */
const scriptBindings = (script: string | undefined): Map<string, ClassSource> => {
    const bindings = new Map<string, ClassSource>();
    if (script === undefined) return bindings;
    const { program } = babelParse(script, { sourceType: 'module', plugins: ['typescript'] });
    for (const statement of program.body) {
        if (statement.type !== 'VariableDeclaration') continue;
        for (const declarator of statement.declarations)
            if (declarator.id.type === 'Identifier')
                bindings.set(declarator.id.name, classSourceOf(declarator.init));
    }
    return bindings;
};

/**
 * The class tokens an element's `:class` binding can produce: literals in the expression, and
 * the literals in the bindings it names, followed one level further.
 *
 * @param node - The element.
 * @param bindings - The script's top-level bindings.
 * @returns The tokens; empty when there is no `:class` or it does not parse.
 */
const dynamicClassTokens = (
    node: TemplateNode,
    bindings: ReadonlyMap<string, ClassSource>
): string[] => {
    const expression = node.props?.find(
        (prop) =>
            prop.type === NODE.directive && prop.name === 'bind' && prop.arg?.content === 'class'
    )?.exp?.content;
    if (expression === undefined) return [];
    let source: ClassSource;
    try {
        source = classSourceOf(babelParse(`(${expression})`, { plugins: ['typescript'] }).program);
    } catch {
        return [];
    }
    const first = source.names.flatMap((name) => bindings.get(name) ?? []);
    const second = first.flatMap((binding) =>
        binding.names.flatMap((name) => bindings.get(name) ?? [])
    );
    return tokensOf([...source.strings, ...[...first, ...second].flatMap((b) => b.strings)]);
};

/** A class without its variants (`sm:hover:min-h-0` → `min-h-0`), brackets respected. */
const bareClass = (token: string): string => token.replace(/^(?:(?:\[[^\]]*]|[^:[])*:)*/, '');

/**
 * The prop a utility duplicates on a Vuetify component, if any.
 *
 * @param component - The Vuetify component (`VBtn`).
 * @param tag - The tag as written, for the `tags` filter.
 * @param token - The class token, variants included.
 * @param context - Vuetify's props and the theme colours.
 * @returns The prop to use instead, or `undefined`.
 */
const duplicatedProp = (
    component: string,
    tag: string,
    token: string,
    context: TemplateContext
): string | undefined => {
    const own = context.props.get(component) ?? new Set<string>();
    const kebab = tag.startsWith('v-')
        ? tag
        : component.replaceAll(
              /([A-Z])/g,
              (_, letter: string, at: number) => `${at === 0 ? '' : '-'}${letter.toLowerCase()}`
          );
    for (const route of PROP_ROUTES) {
        const match = new RegExp(route.pattern).exec(bareClass(token));
        const fits =
            match !== null &&
            (route.tags === undefined || new RegExp(route.tags).test(kebab)) &&
            (route.themeColor !== true || context.colors.has(match[1]));
        const prop = fits ? route.props.find((name) => own.has(name)) : undefined;
        if (prop !== undefined) return prop;
    }
    return undefined;
};

/** Whether a native `title` on this tag reaches the DOM as the browser tooltip. */
const hasNativeTitle = (tag: string, context: TemplateContext): boolean => {
    const component = vuetifyComponent(tag);
    if (component !== undefined) return !(context.props.get(component)?.has('title') ?? false);
    return /^[a-z][\da-z]*$/.test(tag) && !VUE_BUILTINS.has(tag);
};

/**
 * One offence an element check found.
 */
interface ElementOffence {
    /** The ratchet anchor. */
    anchor: string;
    /** What fired. */
    snippet: string;
    /** A fix more specific than the check's default. */
    fix?: string;
    /** The offending attribute's line, when it is not the tag's. */
    line?: number;
}

/** A check over one element: one offence per hit. */
type ElementCheck = (
    node: TemplateNode & { tag: string },
    context: TemplateContext
) => ElementOffence[];

/** The element-level checks, by id. */
const ELEMENT_CHECKS: readonly (readonly [CheckId, ElementCheck])[] = [
    [
        'vuetify-prop-first',
        (node, context) => {
            const component = vuetifyComponent(node.tag);
            if (component === undefined) return [];
            return classTokens(node).flatMap((token) => {
                const prop = duplicatedProp(component, node.tag, token, context);
                return prop === undefined
                    ? []
                    : [
                          {
                              anchor: `${node.tag}.${token}`,
                              snippet: `<${node.tag} class="… ${token} …">`,
                              fix: `Use the \`${prop}\` prop instead of \`${token}\`.`
                          }
                      ];
            });
        }
    ],
    [
        'tailwind-important',
        (node) =>
            classTokens(node)
                .filter((token) => bareClass(token).startsWith('!') || token.endsWith('!'))
                .map((token) => ({
                    anchor: `${node.tag}.${token}`,
                    snippet: `class="… ${token} …"`
                }))
    ],
    [
        'vuetify-arbitrary-variant',
        (node) =>
            classTokens(node)
                .filter((token) => /\[[^\]]*\.v-[^\]]*]:/.test(token))
                .map((token) => ({
                    anchor: `${node.tag}.${token}`,
                    snippet: `class="… ${token} …"`
                }))
    ],
    [
        'vuetify-variable',
        (node) =>
            classTokens(node)
                .filter((token) => /^\[--v-[\w-]+:/.test(bareClass(token)))
                .map((token) => ({
                    anchor: `${node.tag}.${token}`,
                    snippet: `class="… ${token} …"`
                }))
    ],
    [
        'native-title',
        (node, context) => {
            const attribute = titleAttribute(node);
            if (attribute === undefined || !hasNativeTitle(node.tag, context)) return [];
            const value = squash(attribute.value?.content ?? attribute.exp?.content ?? '');
            return [
                {
                    anchor: `${node.tag} title=${value}`,
                    snippet: `<${node.tag} title="${value}">`,
                    line: attribute.loc.start.line
                }
            ];
        }
    ]
];

/** Every element of a template tree, depth first. */
const elementsOf = (nodes: TemplateNode[]): (TemplateNode & { tag: string })[] =>
    nodes.flatMap((node) => [
        ...(node.type === NODE.element && node.tag !== undefined
            ? [{ ...node, tag: node.tag }]
            : []),
        ...elementsOf(childrenOf(node))
    ]);

/** The id of an element, as a `css-allow` before it names it. */
const elementTarget = (file: string, node: TemplateNode): string =>
    `${file}:${String(node.loc.start.line)}:${String(node.loc.start.column)}`;

/**
 * The `<!-- css-allow … -->` comments of a template, each pointed at the next element sibling.
 *
 * @param file - The SFC.
 * @param nodes - The root children.
 * @returns The allowances.
 */
const templateAllowances = (file: string, nodes: TemplateNode[]): Allowance[] =>
    nodes.flatMap((node, index) => {
        const next = nodes.slice(index + 1).find((sibling) => sibling.type === NODE.element);
        const own =
            node.type === NODE.comment
                ? parseAllowance(
                      file,
                      node.loc.start.line,
                      node.content ?? '',
                      next && elementTarget(file, next)
                  )
                : undefined;
        return [...(own === undefined ? [] : [own]), ...templateAllowances(file, childrenOf(node))];
    });

/**
 * The scoped rules that restyle a Vuetify component through a class set on its tag: the selector
 * names a static class carried by a `v-*` element, and the rule declares a real property (a custom
 * property such as `--glow-x` only feeds our own CSS, so it is not an override).
 *
 * @param file - The SFC, relative to the repo root.
 * @param text - Its source.
 * @param elements - The template's elements.
 * @returns The raw hits.
 */
const rootOverrideHits = (
    file: string,
    text: string,
    elements: (TemplateNode & { tag: string })[]
): RawHit[] => {
    const onVuetify = new Set(
        elements
            .filter((node) => vuetifyComponent(node.tag) !== undefined)
            .flatMap((node) => classTokens(node))
    );
    if (onVuetify.size === 0) return [];
    return parseSfc(text, { filename: file }).descriptor.styles.flatMap((style) => {
        const found: RawHit[] = [];
        postcss.parse(style.content).walkRules((rule) => {
            const named = selectorParser()
                .astSync(rule.selector)
                .nodes.flatMap((selector) => classesOf(selector))
                .filter((name) => onVuetify.has(name));
            const real = declsOf(rule).filter((decl) => !decl.prop.startsWith('--'));
            if (named.length === 0 || real.length === 0) return;
            const line = style.loc.start.line + (rule.source?.start?.line ?? 1) - 1;
            found.push(
                hitOf({
                    file,
                    line,
                    check: 'vuetify-root-override',
                    anchor: squash(rule.selector),
                    snippet: real.map((decl) => declText(decl)).join(' · '),
                    target: `${file}:${String(line)}`
                })
            );
        });
        return found;
    });
};

/**
 * Every template hit and allowance of one SFC.
 *
 * @param file - The SFC, relative to the repo root.
 * @param text - Its source.
 * @param context - Vuetify's props and the theme colours.
 * @returns The raw scan.
 */
export const scanTemplate = (file: string, text: string, context: TemplateContext): Scan => {
    const ast: unknown = parseSfc(text, {
        filename: file,
        templateParseOptions: { comments: true }
    }).descriptor.template?.ast;
    const roots = isTemplateNode(ast) ? childrenOf(ast) : [];
    const bindings = scriptBindings(
        parseSfc(text, { filename: file }).descriptor.scriptSetup?.content
    );
    const elements = elementsOf(roots).map((node) => ({
        ...node,
        dynamicTokens: dynamicClassTokens(node, bindings)
    }));
    const rootOverrides = rootOverrideHits(file, text, elements);
    const hits = elements.flatMap((node) =>
        ELEMENT_CHECKS.flatMap(([check, run]) =>
            run(node, context).map(({ line, ...offence }) =>
                hitOf({
                    ...offence,
                    file,
                    line: line ?? node.loc.start.line,
                    check,
                    target: elementTarget(file, node)
                })
            )
        )
    );
    return { hits: [...hits, ...rootOverrides], allowances: templateAllowances(file, roots) };
};

/**
 * The default template context: Vuetify's props and the theme colours.
 *
 * @returns The context.
 */
export const templateContext = (): TemplateContext => ({
    props: vuetifyProps(),
    colors: themeColorNames()
});

// ── Scripts ───────────────────────────────────────────────────────────────────────────────────

/** A DOM query whose selector names a Vuetify class. */
const VUETIFY_DOM_QUERY =
    /\.(?:closest|querySelector|querySelectorAll|matches)\(\s*(["'`])[^"'`]*(?:\.v-|class\*=["']?v-)[^"'`]*\1\s*\)/g;

/**
 * Every script hit and allowance of one file. An allowance is a `// css-allow …` comment on the
 * line above the call.
 *
 * @param file - The file, relative to the repo root.
 * @param text - Its source.
 * @returns The raw scan.
 */
export const scanScript = (file: string, text: string): Scan => {
    const lines = text.split('\n');
    const hits = lines.flatMap((content, index) =>
        [...content.matchAll(VUETIFY_DOM_QUERY)].map((match) =>
            hitOf({
                file,
                line: index + 1,
                check: 'vuetify-dom-query',
                anchor: match[0].slice(1),
                snippet: squash(content),
                target: `${file}:${String(index + 1)}`
            })
        )
    );
    const allowances = lines.flatMap((content, index) => {
        const comment = /^\s*\/\/\s*(css-allow\b.*)$/.exec(content)?.[1];
        const allowance =
            comment === undefined
                ? undefined
                : parseAllowance(file, index + 1, comment, `${file}:${String(index + 2)}`);
        return allowance === undefined ? [] : [allowance];
    });
    return { hits, allowances };
};

/** Source files under `src/` that ship: test folders and specs excluded. */
const shippedScripts = (): string[] =>
    globSync('src/**/*.{ts,vue}', { cwd: ROOT }).filter(
        (file) => !/(?:^|\/)tests\//.test(file) && !/\.(?:spec|test)\.ts$/.test(file)
    );

// ── Allowances and the whole scan ─────────────────────────────────────────────────────────────

/** Distinct Vuetify parts a rule names, the app-wide scope containers left out. */
const vuetifyParts = (selector: string): Set<string> =>
    new Set(
        [...selector.matchAll(/\.(v-[\w-]+)/g)]
            .map((match) => match[1].replace(/(?:__|--).*$/, ''))
            .filter((name) => !/^v-(?:application|overlay-container|theme)$/.test(name))
    );

/** Whether a valid allowance covers a hit: same check, same node. */
const covers = (allowance: Allowance, hit: RawHit): boolean =>
    allowance.problem === undefined &&
    allowance.check === hit.check &&
    allowance.target === hit.target;

/**
 * Applies the allowances: drops the hits they cover, and turns each one that covers nothing, is
 * malformed, or covers more than one Vuetify part into a finding of its own.
 *
 * @param scan - Every raw hit and allowance.
 * @returns The findings.
 */
export const applyAllowances = ({ hits, allowances }: Scan): CssFinding[] => {
    const kept = hits.filter((hit) => !allowances.some((allowance) => covers(allowance, hit)));
    const own = allowances.flatMap((allowance): CssFinding[] => {
        const covered = hits.filter((hit) => covers(allowance, hit));
        const broad = covered.some(
            (hit) => hit.check === 'vuetify-internal' && vuetifyParts(hit.anchor).size > 1
        );
        let check: CheckId | undefined;
        let snippet = allowance.text;
        if (allowance.problem !== undefined)
            [check, snippet] = ['bad-allowance', `${allowance.text} (${allowance.problem})`];
        else if (covered.length === 0) check = 'stale-allowance';
        else if (broad)
            [check, snippet] = [
                'bad-allowance',
                `${allowance.text} (covers more than one Vuetify part)`
            ];
        if (check === undefined) return [];
        return [
            {
                file: allowance.file,
                line: allowance.line,
                check,
                anchor: allowance.text,
                snippet,
                fix: CHECKS[check].fix
            }
        ];
    });
    return [...kept.map(({ target: _target, ...finding }) => finding), ...own];
};

/**
 * Runs every check over the app: CSS, SFC templates, shipped scripts.
 *
 * @returns Every finding, sorted by file, line and check.
 */
export const scanApp = async (): Promise<CssFinding[]> => {
    const css = await scanCss();
    const context = templateContext();
    const templates = vueFiles().map((file) => scanTemplate(file, readRoot(file), context));
    const scripts = shippedScripts().map((file) => scanScript(file, readRoot(file)));
    const all = [css, ...templates, ...scripts];
    return applyAllowances({
        hits: all.flatMap((scan) => scan.hits),
        allowances: all.flatMap((scan) => scan.allowances)
    }).toSorted(
        (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.check.localeCompare(b.check)
    );
};
