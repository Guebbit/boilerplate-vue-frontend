import eslint from '@eslint/js';
import globals from 'globals';
import pluginUnicorn from 'eslint-plugin-unicorn';
import { globalIgnores } from 'eslint/config';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import pluginVitest from '@vitest/eslint-plugin';
import pluginCypress from 'eslint-plugin-cypress';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import tseslint from 'typescript-eslint';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Module boundaries, one config block per module.
 *
 * A module owns everything about its domain and exposes one surface: `index.ts`. A sibling may
 * import `@/modules/<name>`; reaching `@/modules/<name>/store` or any other internal is what these
 * rules stop, because the moment one happens the module stops being deletable.
 *
 * The list is read from the filesystem rather than written out, so adding a domain never edits
 * this file — which is the same reason `src/modules.ts` is the only place that names one. Each
 * block negates the module's own path, because a module reaches its own files by the same absolute
 * `@/` spelling used everywhere else in this codebase.
 */
const moduleBoundaryRules = readdirSync(fileURLToPath(new URL('src/modules', import.meta.url)), {
    withFileTypes: true
})
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => ({
        files: [`src/modules/${name}/**/*.{ts,mts,tsx,vue}`],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/modules/*/*', `!@/modules/${name}/**`],
                            message:
                                'Import a sibling module through its public barrel (@/modules/<name>), never its internals.'
                        }
                    ]
                }
            ]
        }
    }));

/**
 * The domain layer: `src/modules/<name>/domain/**` — pure rules.
 *
 * The only rule here about what a file may TOUCH rather than which tier it may reach. Plain
 * TypeScript over plain data: no framework, no tier, no sibling, and no `../`.
 *
 * Thin on a frontend by design — prices, totals and eligibility come from the API. What belongs
 * here is what the UI needs before it calls. Most modules have no `domain/` at all.
 * See `docs/theory/domain-layer.md`.
 */
const domainPurityRules = [
    {
        files: ['src/modules/*/domain/**/*.{ts,mts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'vue',
                            message:
                                'The domain layer may not know it is rendered. Return a value; the component decides what to draw with it.'
                        },
                        {
                            name: 'pinia',
                            message:
                                'The domain layer may not hold state. Take the data as an argument and let the store own the reactivity.'
                        },
                        {
                            name: 'axios',
                            message:
                                'The domain layer may not talk to the API. A rule decides; the store fetches.'
                        },
                        {
                            name: 'vue-router',
                            message: 'The domain layer may not know about routes.'
                        },
                        {
                            name: 'vue-i18n',
                            message:
                                'The domain layer may not produce user-facing copy. Return a verdict the caller translates.'
                        }
                    ],
                    patterns: [
                        {
                            group: [
                                '@/infrastructure/**',
                                '@/kernel/**',
                                '@/app/**',
                                '@/ui/**',
                                '@/modules/**',
                                '../*',
                                '../../*'
                            ],
                            message:
                                'The domain layer imports nothing but plain TypeScript — no tier, no sibling module, and none of the outer files of its own module. If a rule needs i18n it is returning a message where it should return a verdict; if it needs the store it is doing the job of the store.'
                        }
                    ]
                }
            ]
        }
    }
];

/**
 * Tier boundaries.
 *
 * The tiers are ordered `infrastructure → ui → kernel → modules`, and every arrow points one way: a
 * tier may import the ones below it and never the ones above. What each one is allowed to know:
 *
 *   infrastructure  nothing about this app        http client, i18n runtime, errors, formatters,
 *                                                 uploads, logger, session, observability
 *   ui              the design system, no domain  tokens, icons, and the components built on them
 *   kernel          this KIND of app, no domain   the module registry — and nothing else
 *   modules         one domain each, top to bottom
 *
 * Written out rather than generated, unlike `moduleBoundaryRules` above: there are four tiers and
 * they are named in the architecture, so a new one is a decision rather than a folder appearing.
 *
 * One allowance is deliberate and load-bearing: `kernel` may import `@/modules` (the singular
 * file listing which domains are in this build) but never `@/modules/<name>` — the registry is the
 * only channel between the shell and a domain, and it is what lets the router splice every domain
 * route without naming one.
 */
const tierBoundaryRules = [
    {
        files: ['src/infrastructure/**/*.{ts,mts,tsx,vue}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@/ui/**',
                                '@/kernel/**',
                                '@/app/**',
                                '@/modules',
                                '@/modules/**'
                            ],
                            message:
                                'infrastructure is the bottom tier: it knows nothing about this app. It may not import ui, kernel, app or a module.'
                        }
                    ]
                }
            ]
        }
    },
    {
        files: ['src/ui/**/*.{ts,mts,tsx,vue}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/kernel/**', '@/app/**', '@/modules', '@/modules/**'],
                            message:
                                'ui is the design system: it may not import kernel, app or a module. A component that needs domain data takes it as a prop.'
                        },
                        {
                            group: ['@/infrastructure/session*', '@/infrastructure/observability*'],
                            message:
                                'ui may use infrastructure, but not the app-stateful parts of it. Session and observability are read by the caller and passed in — a design-system component that reads who is signed in cannot be reused.'
                        }
                    ]
                }
            ]
        }
    },
    {
        files: ['src/kernel/**/*.{ts,mts,tsx,vue}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/modules', '@/modules/*', '@/modules/*/**', '@/app/**'],
                            message:
                                'the kernel knows this KIND of app, never this one: it may not import a module, nor `@/modules` — the registry names every enabled domain, which is what `src/app` is for.'
                        },
                        {
                            group: ['@/ui/**'],
                            message:
                                'the kernel is the module system: it assembles modules, it does not render. A component belongs in @/ui (survives a copy-paste into another product), src/app (knows this app) or src/modules/<name> (knows one domain).'
                        }
                    ]
                }
            ]
        }
    }
];

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

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
         * Generated by `npm run gen:asyncapi`, and shared byte-for-byte with the API repo, which
         * ignores its own copy for the same reason. Linting generated output means editing a
         * generator to satisfy a rule, or carrying a suppression header that only one of the two
         * repos can act on.
         */
        'src/types/asyncapi.generated.ts',
        // Generated in the paired backend and copied here byte-identical — see its header.
        'src/infrastructure/observability/analytics-events.ts'
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

            /*
             * Two unicorn rules turned off rather than exempted eleven times.
             *
             * Each was being disabled inline wherever it fired, which is the signal that the rule
             * disagrees with the stack rather than with the code:
             *
             *   no-null              — the DOM and the API both use `null` with meaning. A
             *                          `ref<T | null>(null)` is Vue's own idiom, and a JSON body
             *                          carrying `null` is not carrying `undefined`.
             *   no-useless-undefined — an explicit `undefined` is this codebase's stated way of
             *                          saying "looked, found nothing".
             *
             * A rule that needs eight exemptions is not catching bugs, it is collecting signatures.
             */
            'unicorn/no-null': 'off',
            'unicorn/no-useless-undefined': 'off',
            'vue/script-indent': 'off',
            'vue/multi-word-component-names': 'off',
            'vue/require-default-prop': 'off',
            'vue/no-v-html': 'off',

            /**
             * One block order across every SFC: script, then template, then style.
             *
             * The rule's own default is `[['script', 'template'], 'style']` — script and template
             * interchangeable — which is how this codebase ended up with both spellings and with
             * two sibling list views that could not be read side by side. Naming the order
             * explicitly is the point; which order it is matters far less than that there is one.
             *
             * Components declaring both a plain `<script>` (for `name`) and a `<script setup>`
             * keep them adjacent in that order, since both count as `script` here.
             */
            'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],

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
             * `Error` messages, analytics event names — are deliberately English; see the i18n
             * section of README.md.
             */
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
            ],
            '@typescript-eslint/no-non-null-assertion': 'off',
            // '@typescript-eslint/no-confusing-void-expression': 'off',
            '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
            'no-nested-ternary': 'off',
            'unicorn/no-nested-ternary': 'off',
            'unicorn/prefer-top-level-await': 'off',

            '@typescript-eslint/restrict-plus-operands': [
                'error',
                {
                    allowNumberAndString: true
                }
            ],

            /*
             * The same accommodations the paired backend documents at length: numbers stringify
             * one way; `=> emit(...)` is the idiom, not a confusion; `_`-prefixed means "unused
             * on purpose"; and `value || fallback` on a STRING is the spelling of "empty means
             * unset".
             */
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
            '@typescript-eslint/no-confusing-void-expression': [
                'error',
                { ignoreArrowShorthand: true }
            ],
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
            ],
            '@eslint-community/eslint-comments/require-description': 'error',

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
            ],

            // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/consistent-destructuring.md
            'unicorn/better-regex': 'error',

            // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/better-regex.md
            'unicorn/consistent-destructuring': 'error',

            // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/filename-case.md
            // Every file is kebab-case — one convention across both paired repos. Vue components
            // and tests are the deliberate exceptions (see below).
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

            // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/string-content.md
            // 'unicorn/string-content': [
            //   'error',
            //   {
            //     patterns: {
            //       unicorn: '🦄',
            //       awesome: {
            //         suggest: '😎',
            //         message: 'Please use `😎` instead of `awesome`.',
            //       },
            //       cool: {
            //         suggest: '😎',
            //         fix: false,
            //       },
            //     },
            //   },
            // ],
        }
    },

    ...tierBoundaryRules,

    ...moduleBoundaryRules,

    /*
     * After the module rules, deliberately: `domain/` is inside a module, so this block has to be
     * the later word on those files or the module block would be the only one applied.
     */
    ...domainPurityRules,

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

    /**
     * "Special" files names are better to be left untouched
     */
    {
        files: ['tests/**/*', '**/*.spec.ts', '**/*.test.ts', '**/*.cy.ts', '**/*.d.ts'],
        rules: {
            'unicorn/filename-case': 'off',
            'unicorn/prevent-abbreviations': 'off'
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
        // Both central e2e homes, matching `cypress.config.ts`'s `specPattern`: the functional
        // specs and the visual ones. A spec this list does not reach falls through to the default
        // parser, which has no project claiming it, and lints as a parse error rather than as
        // Cypress code.
        files: [
            'tests/e2e/{specs,visual}/**/*.{cy,spec}.{js,ts,jsx,tsx}',
            'src/modules/*/tests/e2e/**/*.{cy,spec}.{js,ts,jsx,tsx}',
            'tests/support/e2e/**/*.{js,ts,jsx,tsx}'
        ],
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: ['./tsconfig.cypress.json']
            }
        }
    }
);
