import eslint from '@eslint/js';
import globals from 'globals';
import pluginUnicorn from 'eslint-plugin-unicorn';
import { globalIgnores } from 'eslint/config';
import {
    configureVueProject,
    defineConfigWithVueTs,
    vueTsConfigs
} from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility';
import pluginVitest from '@vitest/eslint-plugin';
import pluginCypress from 'eslint-plugin-cypress';
import pluginJsdoc from 'eslint-plugin-jsdoc';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ALL_SPEC_GLOBS } from './scripts/e2e/cypress-spec-globs';
import { assertAcyclicModuleEdges, MODULE_EDGES } from './scripts/module-edges';
import { MODULE_GROUPS } from './scripts/module-groups';

/**
 * Every module `MODULE_GROUPS` labels `shop` — the removable pet-supply domain. Computed once
 * rather than per module below, since the list is the same for every `foundation` caller.
 */
const shopModuleNames = Object.entries(MODULE_GROUPS)
    .filter(([, group]) => group === 'shop')
    .map(([name]) => name);

/**
 * Module boundaries, one config block per module.
 *
 * A module owns everything about its domain and exposes one surface: `index.ts`. A sibling may
 * import `@/modules/<name>`; reaching `@/modules/<name>/store` or any other internal is what the
 * first pattern below stops, because the moment one happens the module stops being deletable. The
 * second pattern is coupling, not internals: a module may only reach the siblings `MODULE_EDGES`
 * names for it, so a new cross-module import fails at lint time until someone decides it belongs.
 * The third locks in the `foundation | shop` direction `MODULE_GROUPS` labels: a `foundation`
 * module ships with every deployment, so it may not import a `shop` module — the removable demo
 * domain — even one `MODULE_EDGES` would otherwise allow.
 *
 * The list is read from the filesystem rather than written out, so adding a domain never edits
 * this file — which is the same reason `src/modules.ts` is the only place that names one. Each
 * block negates the module's own path, because a module reaches its own files by the same absolute
 * `@/` spelling used everywhere else in this codebase.
 */
const moduleFolderNames = readdirSync(fileURLToPath(new URL('src/modules', import.meta.url)), {
    withFileTypes: true
})
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name);

// A cycle, or a key naming a module already deleted, must fail every `npm run lint` — see FA73.
// `moduleDependencyPolicies` below only ever checks a module against its OWN `MODULE_EDGES`
// entry, so this is the one place the graph is walked as a whole.
assertAcyclicModuleEdges(MODULE_EDGES, moduleFolderNames);

/**
 * The "one door" and `MODULE_EDGES` coupling, as `eslint-plugin-boundaries` policies — one array
 * per module, generated the same way the old `no-restricted-imports` blocks were (FE-D2).
 *
 * Two things per module: it may reach a listed sibling's `index.ts` and nothing else of it
 * (reaching `@/modules/<name>/store` directly is what makes a module stop being deletable), and if
 * it is `foundation` (`MODULE_GROUPS`) it may not reach a `shop` module even one `MODULE_EDGES`
 * would otherwise allow — `shop` is the removable demo domain, so `foundation` cannot depend on it.
 *
 * `MODULE_EDGES`' values are BACKEND module names (see that file's own docblock): a value with no
 * matching FE folder — `addresses`, `audit-logs`, `invoicing` — never resolves to an import
 * `boundaries/dependencies` could see, so it is filtered out here rather than left to name an
 * element pattern nothing under `src/modules` will ever match.
 */
const moduleDependencyPolicies = moduleFolderNames.flatMap((name) => {
    const reaches = (MODULE_EDGES[name] ?? []).filter((reach) => moduleFolderNames.includes(reach));
    const isFoundation = MODULE_GROUPS[name] === 'foundation';
    return [
        ...(reaches.length > 0
            ? [
                  {
                      from: { element: { type: 'module', captured: { module: name } } },
                      allow: {
                          to: {
                              element: {
                                  type: 'module',
                                  fileInternalPath: 'index.ts',
                                  captured: { module: reaches }
                              }
                          }
                      }
                  }
              ]
            : []),
        ...(isFoundation && shopModuleNames.length > 0
            ? [
                  {
                      from: { element: { type: 'module', captured: { module: name } } },
                      disallow: {
                          to: { element: { type: 'module', captured: { module: shopModuleNames } } }
                      },
                      message: `${name} is foundation (MODULE_GROUPS in scripts/module-groups.ts): it may not import a shop module. Foundation ships with every deployment and must not depend on the removable shop domain.`
                  }
              ]
            : [])
    ];
});

/**
 * Where every tier lives, for `boundaries/elements`. `capture` reads the module name out of the
 * path so one `module`/`domain` descriptor covers every domain, present or future, the way the old
 * `moduleFolderNames.map` did.
 *
 * ORDER IS SIGNIFICANT: the first descriptor to match a path wins, so `domain` — a module's own
 * subfolder — must come before the `module` pattern that would otherwise claim it too.
 * `partialMatch: false` anchors each pattern at the repo root rather than matching any suffix, so
 * `src/ui` cannot also claim `src/infrastructure/ui-adjacent-thing`.
 */
const boundariesElements = [
    { type: 'domain', pattern: 'src/modules/*/domain', capture: ['module'], partialMatch: false },
    { type: 'module', pattern: 'src/modules/*', capture: ['module'], partialMatch: false },
    { type: 'kernel', pattern: 'src/kernel', partialMatch: false },
    { type: 'ui', pattern: 'src/ui', partialMatch: false },
    { type: 'infrastructure', pattern: 'src/infrastructure', partialMatch: false },
    { type: 'i18n', pattern: 'src/i18n', partialMatch: false },
    { type: 'app', pattern: 'src/app', partialMatch: false },
    { type: 'types', pattern: 'src/types', partialMatch: false }
];

/**
 * The handful of files that are a tier of their own, or a narrower slice of one — an element
 * descriptor matches a FOLDER, so these need `boundaries/files` instead. Named one by one, never a
 * wildcard: the whole point of `boundaries/no-unknown-files` is that a new file has to be
 * classified before it can import anything, and a wildcard here would wave the next one through.
 *
 * `session.ts` and `observability/**` are also `infrastructure` by folder — both classifications
 * apply at once, which is what lets `ui`'s policy below allow `infrastructure` in general and then
 * disallow these two specifically, in that order.
 */
const boundariesFiles = [
    { pattern: 'src/main.ts', category: 'composition-root' },
    { pattern: 'src/App.vue', category: 'composition-root' },
    { pattern: 'src/modules.ts', category: 'registry' },
    { pattern: 'src/globals.d.ts', category: 'ambient' },
    { pattern: 'src/vite-env.d.ts', category: 'ambient' },
    { pattern: 'src/demo-modules.ts', category: 'demo-manifest' },
    { pattern: 'src/modules/*/tests/**/*.ts', category: 'spec' },
    { pattern: 'src/infrastructure/session.ts', category: 'infra-app-state' },
    { pattern: 'src/infrastructure/observability/**/*.ts', category: 'infra-app-state' }
];

/**
 * The tier ladder and the module system's own rules, as `boundaries/dependencies` policies.
 *
 * `default: 'disallow'` in the rule config below means every edge starts refused; each entry here
 * OPENS one. Read top to bottom — the LAST matching policy wins, so a later, narrower entry (the
 * barrel-only door, `ui`'s carve-out of `session.ts`/`observability`) overrides a broader one
 * stated earlier for the same edge.
 *
 * The ladder, bottom to top: `i18n → infrastructure → ui → kernel → modules(+domain) → app`. A
 * tier may import the ones below it and never the ones above — see `docs/theory/layers.md`. `app`
 * is the one exception worth naming: nothing may reach it, including a module, which is exactly
 * the gap FA-D2/FA96 closes — `src/kernel/route-link.ts` exists because of it (see its own
 * docblock). `types` is erased at compile time, so every tier may reach it; a resolved import
 * outside `src/` (`@api`, `contracts/`, `tests/support/`) matches no element or file here and is
 * invisible to this rule the same way it is to the old `no-restricted-imports` patterns — narrower
 * than that is a separate concern from FE-D2/FA96, not this change's job.
 */
const layerDependencyPolicies = [
    // npm. The graph being described is this repository's; a package belongs to no tier of it.
    { allow: { to: { module: { origin: 'external' } } } },

    // `types` is erased at compile time: every tier may read it, including `domain`.
    { allow: { to: { element: { type: 'types' } } } },

    // i18n knows nothing about this app — not even infrastructure — so it may only reach itself.
    {
        from: { element: { type: 'i18n' } },
        allow: { to: { element: { type: 'i18n' } } }
    },

    // infrastructure calls INTO i18n to translate (errors.ts, formatters.ts, uploads.ts, http) —
    // never the other way — plus its own files.
    {
        from: { element: { type: 'infrastructure' } },
        allow: { to: { element: { type: ['infrastructure', 'i18n'] } } }
    },

    // ui may use infrastructure (and i18n through it) in general, but not the app-stateful parts:
    // a design-system component that reads who is signed in cannot be reused. Stated after the
    // general allow above so it overrides it for exactly these two files.
    {
        from: { element: { type: 'ui' } },
        allow: { to: { element: { type: ['ui', 'infrastructure', 'i18n'] } } }
    },
    {
        from: { element: { type: 'ui' } },
        disallow: { to: { file: { categories: ['infra-app-state'] } } },
        message:
            'ui may use infrastructure, but not the app-stateful parts of it. Session and observability are read by the caller and passed in — a design-system component that reads who is signed in cannot be reused.'
    },

    // kernel may use infrastructure and i18n, plus its own files. NOT ui, despite ui sitting
    // "below" it on the ladder: the kernel assembles modules, it does not render — see the
    // disallow below, stated after this allow so it overrides it for `ui` specifically.
    {
        from: { element: { type: 'kernel' } },
        allow: { to: { element: { type: ['kernel', 'infrastructure', 'i18n'] } } }
    },
    {
        from: { element: { type: 'kernel' } },
        disallow: { to: { element: { type: ['ui', 'module', 'domain', 'app'] } } },
        message:
            'the kernel is the module system: it assembles modules, it does not render, and it never knows which domains exist. A component belongs in @/ui (survives a copy-paste into another product), src/app (knows this app) or src/modules/<name> (knows one domain); a module or the registry belongs in src/app or src/modules.ts, never here.'
    },

    // A module reaches its own files (any tier, including its own `domain/`) and kernel/ui/infra/
    // i18n freely; the one door into a SIBLING is the barrel policy generated above.
    {
        from: { element: { type: 'module' } },
        allow: {
            to: [
                { element: { captured: { module: '{{ from.element.captured.module }}' } } },
                { element: { type: ['kernel', 'ui', 'infrastructure', 'i18n'] } }
            ]
        }
    },
    // A module never imports its own barrel — the export is one relative import away from the
    // real file, and importing it back risks a load-order cycle under `export *`. Stated after
    // the self-reach allow above so it overrides that allow for this one path; a SIBLING's
    // `index.ts` stays reachable, since this only matches the module's OWN captured name.
    {
        from: { element: { type: 'module' } },
        disallow: {
            to: {
                element: {
                    type: 'module',
                    fileInternalPath: 'index.ts',
                    captured: { module: '{{ from.element.captured.module }}' }
                }
            }
        },
        message:
            'A module does not import its own barrel — the export is one relative import away from the real file.'
    },

    // The domain layer: plain TypeScript over plain data, reaching only its own folder (`types`
    // above already covers the one thing outside it this codebase lets it take).
    {
        from: { element: { type: 'domain' } },
        allow: {
            to: {
                element: {
                    type: 'domain',
                    captured: { module: '{{ from.element.captured.module }}' }
                }
            }
        }
    },
    {
        from: { element: { type: 'domain' } },
        disallow: {
            to: {
                element: { type: ['infrastructure', 'kernel', 'app', 'ui', 'i18n', 'module'] }
            }
        },
        message:
            'The domain layer imports nothing but plain TypeScript — no tier, no sibling module, and none of the outer files of its own module. If a rule needs i18n it is returning a message where it should return a verdict; if it needs the store it is doing the job of the store.'
    },

    // app assembles the application: every domain's barrel (never an internal), plus kernel, ui,
    // infrastructure, i18n and its own files.
    {
        from: { element: { type: 'app' } },
        allow: {
            to: [
                { element: { type: 'app' } },
                { element: { type: 'module', fileInternalPath: 'index.ts' } },
                { element: { type: ['kernel', 'ui', 'infrastructure', 'i18n'] } },
                { file: { categories: ['registry'] } }
            ]
        }
    },
    // …and never the other way. This is the specific gap FA-D2/FA96 closes: nothing below `app`
    // may reach it, a module included — see `src/kernel/route-link.ts` for where that logic moved.
    {
        from: {
            element: { type: ['module', 'domain', 'kernel', 'ui', 'infrastructure', 'i18n'] }
        },
        disallow: { to: { element: { type: 'app' } } },
        message:
            'Nothing below src/app may reach it — app assembles the application and is the one tier allowed to know every domain. A helper a module needs that only cares about the module SYSTEM (not this app specifically) belongs in src/kernel; see src/kernel/route-link.ts.'
    },

    // The composition root (`main.ts`, `App.vue`) and the registry (`src/modules.ts`) are trusted
    // to assemble everything; each also reaches the other's file category directly, since neither
    // has an element type of its own to match against `type: '*'`.
    {
        from: { file: { categories: ['composition-root'] } },
        allow: {
            to: [
                { element: { type: '*' } },
                { file: { categories: ['composition-root', 'registry'] } }
            ]
        }
    },
    {
        from: { file: { categories: ['registry'] } },
        allow: {
            to: [
                { element: { type: 'kernel' } },
                { element: { type: 'module', fileInternalPath: 'module.ts' } }
            ]
        }
    },

    // A module's own spec reaches `@/modules` (the registry) the way `app` does, to mount the
    // real app in a component test — everything else it needs (its own module, kernel, ui,
    // infra, i18n) is already open via the `module` element it also carries (FA96).
    {
        from: { file: { categories: ['spec'] } },
        allow: { to: { file: { categories: ['registry'] } } }
    }
];

/**
 * `x as unknown as T` — the double cast that erases the type system's objection instead of
 * answering it — is banned everywhere, tests included; the paired backend carries the identical
 * ban. `no-restricted-syntax` does not merge across configs (the nearest match REPLACES the
 * list), so every block that configures that rule spreads this in.
 */
const bannedDoubleCasts = [
    {
        selector: 'TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]',
        message:
            '`as unknown as T` erases the type error instead of answering it. Type the source honestly — or, for a hand-built test stub, use the one sanctioned seam: `asStub<T>()` from tests/support/stub.ts.'
    },
    {
        selector: 'TSAsExpression > TSAsExpression[typeAnnotation.type="TSAnyKeyword"]',
        message:
            '`as any as T` erases the type error instead of answering it. Type the source honestly — or, for a hand-built test stub, use `asStub<T>()` from tests/support/stub.ts.'
    }
];

/*
 * Two unicorn rules turned off rather than exempted eleven times, plus the rest of the
 * plugin's tuning in one place.
 *
 * `no-null`/`no-useless-undefined` were being disabled inline wherever they fired, which
 * is the signal that the rule disagrees with the stack rather than with the code:
 *
 *   no-null              — the DOM and the API both use `null` with meaning. A
 *                          `ref<T | null>(null)` is Vue's own idiom, and a JSON body
 *                          carrying `null` is not carrying `undefined`.
 *   no-useless-undefined — an explicit `undefined` is this codebase's stated way of
 *                          saying "looked, found nothing".
 *
 * A rule that needs eight exemptions is not catching bugs, it is collecting signatures.
 */
const unicornTuningRules = {
    'unicorn/no-null': 'off',
    'unicorn/no-useless-undefined': 'off',
    'no-nested-ternary': 'off',
    'unicorn/no-nested-ternary': 'off',
    'unicorn/prefer-top-level-await': 'off',

    // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/consistent-destructuring.md
    'unicorn/better-regex': 'error',

    // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/better-regex.md
    'unicorn/consistent-destructuring': 'error',

    // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/filename-case.md
    // Every file is kebab-case — one convention across both paired repos, `tests/**`
    // included. Vue components are the one exception, and they are PascalCase rather than
    // unchecked (see below).
    //
    // `.spec.ts` / `.cy.ts` / `.visual.cy.ts` need no exemption: `multipleFileExtensions`
    // defaults on, so only the part before the FIRST dot is checked — `use-async-action`
    // in `use-async-action.spec.ts`. A spec is therefore named after the file it covers,
    // spelled identically, which is what makes the pair greppable.
    'unicorn/filename-case': [
        'error',
        {
            case: 'kebabCase'
        }
    ],

    // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/catch-error-name.md
    'unicorn/catch-error-name': [
        'error',
        {
            name: 'error'
        }
    ],

    // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prevent-abbreviations.md
    'unicorn/prevent-abbreviations': [
        'error',
        {
            replacements: {
                i: false,
                e: false,
                len: false,
                prop: false,
                props: false,
                prev: false,
                opts: {
                    options: true
                },
                ref: {
                    reference: false
                }
            }
        }
    ]
};

/**
 * Vue SFC conventions: the house rules for how a `.vue` file is laid out, independent of
 * what it may import (see the tier/module/domain boundary rules below) or what copy it
 * may render (see `bareStringsInTemplateRule`).
 *
 * `block-order` fixes one order across every SFC: script, then template, then style. The
 * rule's own default is `[['script', 'template'], 'style']` — script and template
 * interchangeable — which is how this codebase ended up with both spellings and with two
 * sibling list views that could not be read side by side. Naming the order explicitly is
 * the point; which order it is matters far less than that there is one. Components
 * declaring both a plain `<script>` (for `name`) and a `<script setup>` keep them adjacent
 * in that order, since both count as `script` here.
 */
const vueSfcConventionRules = {
    'vue/script-indent': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/require-default-prop': 'off',
    // `docs/theory/web-attack-defences.md`'s XSS row rests on "no v-html in src/" — this is what
    // makes that true rather than a claim nothing enforces. A future use gets a line disable next
    // to whatever sanitiser justifies it.
    'vue/no-v-html': 'error',
    'vue/block-order': ['error', { order: ['script', 'template', 'style'] }]
};

/**
 * Every user-facing string goes through vue-i18n. This catches the two shapes that
 * slip past review most easily — a bare text node (`<h3>SSE observability</h3>`) and
 * a static attribute a screen reader or a tab title reads (`alt="logo"`,
 * `title="Realtime playground"`) — since neither looks like "untranslated copy" at a
 * glance the way a missing `t()` call does.
 *
 * The `attributes` list is the accessibility/UX surface only. Attributes that are
 * NOT here (`class`, `id`, `type`, `name`, `variant`…) are markup, not copy.
 *
 * This governs templates. Technician-facing strings — console output, thrown
 * `Error` messages, analytics event names — are deliberately English.
 */
const bareStringsInTemplateRule = {
    'vue/no-bare-strings-in-template': [
        'error',
        {
            // Punctuation, symbols and SI unit abbreviations: identical in every
            // language, so putting them through a dictionary buys nothing and invites
            // a translator to "fix" them.
            allowlist: [
                '(',
                ')',
                ',',
                '.',
                '&',
                '+',
                '-',
                '=',
                '*',
                '/',
                '#',
                '%',
                '!',
                '?',
                ':',
                '[',
                ']',
                '{',
                '}',
                '<',
                '>',
                '·',
                '•',
                '–',
                '—',
                '|',
                '@',
                '©',
                '×',
                'MB',
                'GB',
                'KB',
                'ms'
            ],
            attributes: {
                '/.+/': [
                    'alt',
                    'aria-label',
                    'aria-placeholder',
                    'aria-roledescription',
                    'aria-valuetext',
                    'label',
                    'placeholder',
                    'title'
                ]
            },
            directives: ['v-text']
        }
    ]
};

/**
 * `@typescript-eslint` accommodations that relax `strictTypeChecked`/`stylisticTypeChecked`
 * for shapes this codebase relies on: numbers stringify one way; `=> emit(...)` is the
 * idiom, not a confusion; `_`-prefixed means "unused on purpose"; `value || fallback` on a
 * STRING is the spelling of "empty means unset"; and destructuring is required for objects
 * but not arrays, matching the paired backend.
 */
const typeScriptStrictnessReliefRules = {
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',

    '@typescript-eslint/restrict-plus-operands': [
        'error',
        {
            allowNumberAndString: true
        }
    ],

    '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    '@typescript-eslint/no-unused-vars': [
        'error',
        {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_'
        }
    ],
    '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true } }
    ],
    'prefer-destructuring': 'off',
    '@typescript-eslint/prefer-destructuring': [
        'error',
        {
            VariableDeclarator: { array: false, object: true },
            AssignmentExpression: { array: false, object: false }
        }
    ]
};

/**
 * `@typescript-eslint/naming-convention`, the 78-line ladder covering every syntax kind
 * this codebase names: default identifiers, quoted wire keys, variables, classes/types,
 * functions, interfaces, type aliases, enums, type parameters and class/enum members.
 */
const namingConventionRule = {
    '@typescript-eslint/naming-convention': [
        'error',
        /*
         * `allowSingleOrDouble`, not `allow`. A single leading underscore was permitted
         * and a double one was not — but `__esModule` and friends are fixed spellings
         * owned by other ecosystems, not names this codebase gets to choose.
         */
        {
            selector: 'default',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allowSingleOrDouble',
            trailingUnderscore: 'allow'
        },
        /*
         * Quoted keys are spelled by whoever owns the wire: `'Content-Type'`,
         * `'x-request-id'`, `'data-test'`. Requiring camelCase there asks the codebase to
         * rename an HTTP header, which is why this rule was being disabled inline at
         * every one of those call sites instead.
         */
        {
            selector: ['objectLiteralProperty', 'typeProperty'],
            modifiers: ['requiresQuotes'],
            format: null
        },
        {
            selector: 'variable',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
            leadingUnderscore: 'allowSingleOrDouble',
            trailingUnderscore: 'allow'
        },
        {
            selector: ['class', 'typeLike', 'enum'],
            format: ['PascalCase']
        },
        {
            selector: ['function'],
            format: ['camelCase'],
            leadingUnderscore: 'allow'
        },
        {
            selector: 'interface',
            format: ['PascalCase'],
            custom: {
                regex: '^I[A-Z]',
                match: false
            }
        },
        {
            selector: 'typeAlias',
            format: ['PascalCase'],
            custom: {
                regex: '^[TI][A-Z]',
                match: false
            }
        },
        {
            selector: 'enum',
            format: ['PascalCase'],
            custom: {
                regex: '^E[A-Z]',
                match: false
            }
        },
        {
            selector: 'typeParameter',
            format: ['PascalCase'],
            custom: {
                regex: '^T[A-Z]?',
                match: true
            }
        },
        {
            selector: ['memberLike', 'enumMember'],
            format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
            leadingUnderscore: 'allowSingleOrDouble',
            trailingUnderscore: 'allow'
        }
    ]
};

/**
 * FA95: the preset's own default (`allowComponentTypeUnsafety: true`) turns off
 * `no-unsafe-argument`/`-assignment`/`-return`/`-call`/`-member-access` for every `.ts` AND `.vue`
 * file, to paper over Vue component operations TypeScript-ESLint cannot fully type. This repo
 * bans `any` outright (CLAUDE.md), so those five rules stay on; the rare genuine case (Vue's own
 * generated/framework types producing an `any` the code cannot avoid) gets a line `eslint-disable`
 * with a description instead of a blanket carve-out. Must run before `defineConfigWithVueTs`
 * below — it configures shared, module-level state the preset reads when building its configs.
 */
configureVueProject({ allowComponentTypeUnsafety: false });

export default defineConfigWithVueTs(
    {
        files: ['**/*.{ts,mts,tsx,vue}']
    },

    /**
     * Excluded files
     */
    globalIgnores([
        'dist',
        // The e2e bundle `npm run test:e2e` builds and serves; generated output, same as `dist`.
        'dist-e2e',
        'coverage',
        // The built docs site and its cache; authored docs are markdown, and the VitePress
        // config is linted through the tool-config block below.
        'docs/.vitepress/dist/**',
        'docs/.vitepress/cache/**',
        // Both the generated REST client and, alongside it, `asyncapi.generated.ts` — generated
        // by `npm run gen:asyncapi`, shared byte-for-byte with the API repo, which ignores its
        // own copy for the same reason. Linting generated output means editing a generator to
        // satisfy a rule, or carrying a suppression header that only one of the two repos can act on.
        'contracts',
        'node_modules',
        /*
         * Stryker copies the whole project here per run. Without this, `npm run lint` fails with
         * one parser error per generated file the moment a mutation run is in flight — or forever,
         * if a crashed run left the directory behind — because the copies sit outside the
         * `tsconfig` project `parserOptions.project` resolves against. The API repo ignores the
         * same path for the same reason; see the note in `stryker.config.json`.
         */
        '.stryker-tmp/**',
        /*
         * A working directory that belongs to tooling rather than to this codebase — `.claude/`
         * holds git WORKTREES, whole copies of this project sitting outside the `tsconfig`
         * project `parserOptions.project` resolves against. Same failure as `.stryker-tmp/**`
         * above and the same fix: without it every typed rule throws the moment one exists, and
         * `npm run lint` fails on a copy of code that is already linted where it lives.
         * `.prettierignore` carries the matching list.
         */
        '.claude/**'
    ]),

    /**
     * Base eslint
     */
    eslint.configs.recommended,

    /**
     * Vue + Typescript presets
     */
    pluginVue.configs['flat/essential'],
    /*
     * The strict + stylistic TYPE-CHECKED tiers, matching the paired backend: the type
     * information is already built for the parser, so the rules that consume it cost almost
     * nothing extra and catch what a syntax-only pass cannot.
     */
    vueTsConfigs.strictTypeChecked,
    vueTsConfigs.stylisticTypeChecked,

    /**
     * Unicorn plugin
     */
    pluginUnicorn.configs['flat/recommended'],

    /**
     * Accessibility, at the template: the static half of what the axe sweeps check at runtime.
     *
     * axe audits a rendered page, and only the pages and states a sweep visits. The lint rules
     * read every template, rendered or not, and fail the edit rather than the e2e run — a
     * `<div @click>` with no key handler, an `<img>` with no `alt`, an `aria-` attribute that no
     * element may carry. Production templates only: `tests/` has no templates, and a `.vue`
     * fixture under a module's tests is a test double, not a page.
     *
     * The whole recommended set, nothing switched off: the rules that look at native
     * `<label>`/`<input>` pairs (`label-has-for`, `form-control-has-label`) see nothing in a
     * Vuetify component — `v-text-field` renders its own associated label — and so stay silent
     * rather than noisy here. The runtime sweep covers that gap: an unlabelled field is a
     * `critical` axe finding.
     */
    ...pluginVueA11y.configs['flat/recommended'].map((block) => ({
        ...block,
        files: ['src/**/*.vue'],
        ignores: ['src/modules/*/tests/**']
    })),

    /**
     * Every `eslint-disable` must say why — matching the paired backend.
     */
    comments.recommended,

    /**
     * Global parser settings
     */
    {
        languageOptions: {
            parserOptions: {
                extraFileExtensions: ['.vue']
            }
        }
    },

    /**
     * All global rules
     */
    {
        languageOptions: {
            globals: {
                ...globals.browser
            },
            ecmaVersion: 'latest',
            sourceType: 'module'
        },

        rules: {
            'no-restricted-syntax': ['error', ...bannedDoubleCasts],
            /**
             * `src/infrastructure/logger.ts` is the single console boundary, and holds the only exemptions.
             * An error with one documented exception is a policy; a warning with a disable comment
             * per call site is not.
             */
            'no-console': 'error',
            'no-debugger': 'warn',
            '@eslint-community/eslint-comments/require-description': 'error',

            ...unicornTuningRules,
            ...vueSfcConventionRules,
            ...bareStringsInTemplateRule,
            ...typeScriptStrictnessReliefRules,
            ...namingConventionRule
        }
    },

    /**
     * The tier ladder and the module system, as `eslint-plugin-boundaries` (FE-D2/FA96): deny by
     * default, an explicit `boundaries/dependencies` policy per allowed edge, and
     * `boundaries/no-unknown-files` refuses a FILE under `src/` that no descriptor above claims —
     * the same fail-closed shape the paired backend uses (`eslint.config.ts:665-800` there).
     *
     * Checked against the RESOLVED file via `eslint-import-resolver-typescript`, not the import
     * STRING — a `.vue` file's `<script>` block, a relative `../../` path, a re-export and a
     * dynamic `import()` are all covered the same way a `@/modules/x` specifier is (FA96 #1–2);
     * `eslint-plugin-vue`'s `<script>` parsing plus this resolver's `alwaysTryTypes` is what a
     * half-day spike confirmed before this landed on option A over the fallback (FE-D2).
     */
    {
        files: ['src/**/*.{ts,vue}'],
        plugins: { boundaries },
        settings: {
            'import/resolver': {
                typescript: { alwaysTryTypes: true, project: './tsconfig.app.json' }
            },
            'boundaries/elements': boundariesElements,
            'boundaries/files': boundariesFiles
        },
        rules: {
            'boundaries/no-unknown-files': 'error',
            'boundaries/dependencies': [
                'error',
                {
                    default: 'disallow',
                    message:
                        '{{from.element.type}} may not depend on {{to.element.type}} — see docs/theory/layers.md.',
                    // Without this, same-element imports are skipped entirely (the plugin's own
                    // `isInternalDependency` default), so the own-barrel disallow and the
                    // spec-vs-own-index split above would never run — both are same-module edges.
                    checkInternals: true,
                    policies: [...layerDependencyPolicies, ...moduleDependencyPolicies]
                }
            ]
        }
    },

    /**
     * Component discipline: a `.vue` file wires, it does not call the API.
     *
     * The tiers above answer "what may this file KNOW". This one answers the other question, the
     * one that decides whether a component can be read in one sitting: **how much may it DO**.
     *
     * A component's own logic is what it renders and what it hands to a click. The call behind that
     * click belongs one step away — in a module's `store.ts` or `composables/`, or in
     * `src/infrastructure` for something no domain owns (`localeApi.persistLocalePreference` is the
     * reference case). Moving it there is not ceremony; it is what makes the call testable without
     * mounting anything, reusable by a second component, and mockable in one place.
     *
     * This rule is deliberately about `@api` rather than about line counts, because the import IS
     * the tell. Both cases it was written for were one line each and both had already grown a
     * loading ref and a toast around them:
     *
     * - `AppLanguageSwitcher` PUT the visitor's locale onto their account, which dragged the
     *   session store into a shell component that otherwise only knows about routing.
     * - `Admin.vue` DELETEd expired tokens next to a composable already holding its four other
     *   calls, so the fifth was the only one nothing could test without a mount.
     *
     * Type imports stay legal (`allowTypeImports`). `import type { LoginRequest } from '@api'` is a
     * component naming the shape of a form it submits, which is vocabulary rather than behaviour —
     * and the generated types are the only honest place that shape is written down.
     *
     * `@types` gets the same treatment. `src/types/index.ts` re-exports `@api` as `export type *`
     * — a runtime value never reaches `@types` at all — so this rule exists for the day someone
     * widens that back to `export *` without reading why. The one runtime exception, a generated
     * enum a template branches on (a status badge's color, a select's options), is named in
     * `src/types/enums.ts` and reached as `@/types/enums.ts` — a plain `@/*` path the group below
     * does not match.
     */
    /*
     * The base `no-restricted-imports` is deliberately NOT switched off here, though pairing the
     * two rules normally calls for it. The base rule is where every tier and module boundary above
     * is configured, and this block matches `**\/*.vue` — turning it off would silently un-enforce
     * all of them for exactly the files where most cross-boundary reach happens. The two rules
     * carry disjoint pattern lists and never report on the same import, so both stay on.
     */
    {
        files: ['**/*.vue'],
        rules: {
            '@typescript-eslint/no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@api', '@api/*'],
                            allowTypeImports: true,
                            message:
                                'A component wires, it does not call the API. Put the call in the module’s store or composables/, or in src/infrastructure if no domain owns it, and call that from here. Importing a TYPE from @api is fine.'
                        },
                        {
                            group: ['@types', '@types/*'],
                            allowTypeImports: true,
                            message:
                                'A component reads generated shapes, not values, through @types. A runtime enum a template branches on lives in @/types/enums.ts; a live call still belongs in the module’s store or composables/.'
                        }
                    ]
                }
            ]
        }
    },

    /**
     * try/catch in production code is a speed bump here for the same reason as in the paired
     * backend: prefer a returned verdict or a rejection into the caller's handler, and give each
     * surviving try/catch an `eslint-disable` whose description (enforced above) says what it is
     * containing. Tests are exempt below — probing what was thrown is their job.
     */
    {
        files: ['src/**/*.{ts,mts,tsx,vue}'],
        ignores: ['src/**/__tests__/**', 'src/modules/*/tests/**'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...bannedDoubleCasts,
                {
                    selector: 'TryStatement',
                    message:
                        'try/catch in production code is for the rare spot where a throwing API has no safe wrapper and the failure has a local answer. Prefer returning a verdict or letting the rejection reach the caller\u2019s handler; if this spot truly needs one, disable this rule on the line with a description of what is being contained.'
                }
            ]
        }
    },

    /**
     * Exported API carries its own documentation, and the documentation is checked.
     *
     * CLAUDE.md makes both halves a MUST and neither was guarded. What a rule can decide:
     *
     * Presence:   an exported function, interface, type or enum has a JSDoc block.
     * Accuracy:   a `@param` names a real parameter, tags are real tags, descriptions say something.
     *
     * `require-param` and `require-returns` stay OFF: CLAUDE.md asks for those tags "as needed",
     * and a rule cannot read that word — it would demand a row per parameter restating a typed
     * signature. `disableMissingParamChecks` is that same "as needed" written as an option, and
     * `checkDestructured: false` keeps an options bag documented on its interface rather than at
     * every call site.
     *
     * https://github.com/gajus/eslint-plugin-jsdoc
     */
    {
        files: ['src/**/*.{ts,mts,tsx,vue}'],
        // Specs document themselves by their titles; their exports are fixtures, not API.
        ignores: ['src/**/__tests__/**', 'src/modules/*/tests/**'],

        plugins: { jsdoc: pluginJsdoc },

        // TypeScript mode: types live in the signature, so the tags are not asked to repeat them.
        settings: { jsdoc: { mode: 'typescript' } },

        rules: {
            'jsdoc/require-jsdoc': [
                'error',
                {
                    publicOnly: true,
                    require: {
                        FunctionDeclaration: true,
                        ArrowFunctionExpression: true,
                        FunctionExpression: true,
                        ClassDeclaration: true
                    },
                    contexts: [
                        'TSInterfaceDeclaration',
                        'TSTypeAliasDeclaration',
                        'TSEnumDeclaration'
                    ]
                }
            ],
            'jsdoc/check-param-names': [
                'error',
                { checkDestructured: false, disableMissingParamChecks: true }
            ],
            'jsdoc/check-tag-names': 'error',
            'jsdoc/require-param-description': 'error',
            'jsdoc/require-returns-description': 'error',
            'jsdoc/require-throws': 'error'
        }
    },

    /**
     * Type-aware relief for test code, and only the relief the mocking idiom actually needs —
     * the same list the paired backend documents: probing IS the assertion in a test
     * (`no-unnecessary-condition`), a noop callback is a legitimate fixture
     * (`no-empty-function`), and `expect(mock.method)` hands methods around unbound by design.
     * The double-cast ban stays: tests are where that idiom bred.
     */
    {
        files: [
            'src/**/__tests__/**/*.{ts,tsx}',
            'src/modules/*/tests/**/*.{ts,tsx}',
            'tests/**/*.{ts,tsx}',
            '**/*.{spec,test,cy}.{ts,tsx}'
        ],
        rules: {
            '@typescript-eslint/no-unnecessary-condition': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/no-dynamic-delete': 'off'
        }
    },

    /**
     * The linter's own config and the VitePress config: TypeScript, but outside the project
     * the type-aware program resolves against, so that program is switched off for them —
     * everything syntax-level still applies.
     */
    {
        files: ['eslint.config.ts', 'docs/.vitepress/**/*.{ts,mts}'],
        extends: [tseslint.configs.disableTypeChecked],
        languageOptions: {
            globals: {
                ...globals.node
            }
        },
        rules: {
            'no-console': 'off'
        }
    },

    /**
     * CommonJS config files (e.g. .commitlintrc.cjs) run under Node, not the browser.
     */
    {
        files: ['**/*.cjs'],
        languageOptions: {
            globals: {
                ...globals.node
            },
            sourceType: 'commonjs'
        }
    },

    /**
     * Specific naming conventions for components (PascalCase)
     * WARNING: Slows down a lot
     */
    {
        files: ['**/*.vue', '**/*.tsx'],
        rules: {
            'unicorn/filename-case': [
                'error',
                {
                    case: 'pascalCase'
                }
            ]
        }
    },

    {
        // Scripts and the Cypress config print deliberately — a build script's output IS its
        // interface, and the shard runner reports which backend a run is talking to so a failure
        // can be reproduced. Same policy as `src/infrastructure/logger.ts`: exempt the boundary
        // that owns the output, rather than disabling the rule at each call.
        files: ['scripts/**/*.ts', 'cypress.config.ts'],
        rules: {
            'no-console': 'off'
        }
    },
    {
        // Config files key objects by path glob (`vitest.config.ts`'s per-directory coverage
        // thresholds, orval's per-output entries). Those keys are addresses, not identifiers, and
        // the tool defines their spelling — camelCasing one would just stop it matching anything.
        files: ['**/*.d.ts', '*.config.ts'],
        rules: {
            '@typescript-eslint/naming-convention': 'off'
        }
    },

    /**
     * Tests specific eslint config
     * - Unit Tests (Vitest)
     *  - E2E Tests (Cypress)
     */
    {
        ...pluginVitest.configs.recommended,
        files: ['src/**/__tests__/*', 'tests/**/*', '**/*.{spec,test}.{ts,tsx}'],
        // The e2e suites and their support files are Cypress's, not Vitest's, so all three
        // locations leave this block. A module's co-located specs are split the same way:
        // `src/modules/*/tests/` holds both suites, and only the `.spec.ts` half is Vitest's.
        ignores: ['tests/e2e/**/*', 'tests/support/e2e/**/*', 'src/modules/*/tests/e2e/**/*'],
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: ['./tsconfig.vitest.json']
            }
        }
    },
    {
        ...pluginCypress.configs.recommended,
        // Every spec Cypress may run, plus the support files they import. A spec this list does
        // not reach falls through to the default parser, which has no project claiming it, and
        // lints as a parse error rather than as Cypress code.
        files: [...ALL_SPEC_GLOBS, 'tests/support/e2e/**/*.{js,ts,jsx,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: ['./tsconfig.cypress.json']
            }
        }
    }
);
