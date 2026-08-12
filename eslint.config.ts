import eslint from '@eslint/js';
import globals from 'globals';
import pluginUnicorn from 'eslint-plugin-unicorn';
import { globalIgnores } from 'eslint/config';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import pluginVitest from '@vitest/eslint-plugin';
import pluginCypress from 'eslint-plugin-cypress';
import pluginOxlint from 'eslint-plugin-oxlint';
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

export default defineConfigWithVueTs(
    {
        files: ['**/*.{ts,mts,tsx,vue}']
    },

    /**
     * Excluded files
     */
    globalIgnores([
        'dist',
        'dist-ssr',
        'coverage',
        'docs',
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
        'eslint.config.ts',
        'public/mockServiceWorker.js',
        'tests/support/mocks/generated.ts',
        /*
         * Generated by `npm run genasyncapi`, alongside the mock output above — and shared
         * byte-for-byte with the API repo, which ignores its own copy for the same reason. Linting
         * generated output means editing a generator to satisfy a rule, or carrying a suppression
         * header that only one of the two repos can act on.
         */
        'src/types/realtime.generated.ts'
    ]),

    /**
     * Base eslint
     */
    eslint.configs.recommended,

    /**
     * Vue + Typescript presets
     */
    pluginVue.configs['flat/essential'],
    vueTsConfigs.recommended,
    ...pluginOxlint.configs['flat/recommended'],

    /**
     * Unicorn plugin
     */
    pluginUnicorn.configs['flat/recommended'],

    /**
     * Global parser + dedicated eslint tsconfig
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
                    selector: ['class', 'typeLike', 'typeParameter', 'enum'],
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
                        match: true
                    }
                },
                {
                    selector: 'enum',
                    format: ['PascalCase'],
                    custom: {
                        regex: '^E[A-Z]',
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
            'unicorn/better-regex': 'warn',

            // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/better-regex.md
            'unicorn/consistent-destructuring': 'warn',

            // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/filename-case.md
            // Every file is camelCase except Vue components and tests (see below)
            'unicorn/filename-case': [
                'error',
                {
                    case: 'camelCase'
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
        files: ['tests/**/*', '**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'],
        rules: {
            'unicorn/filename-case': 'off',
            'unicorn/prevent-abbreviations': 'off'
        }
    },
    {
        // Scripts and the mock harness both print deliberately — a build script's output IS its
        // interface, and `apiMock.ts` announces which profile and seed a run is using so a failing
        // screenshot can be reproduced. Same policy as `src/infrastructure/logger.ts`: exempt the boundary
        // that owns the output, rather than disabling the rule at each call.
        files: ['scripts/**/*.ts', 'tests/support/mocks/**/*.ts'],
        rules: {
            'unicorn/filename-case': 'off',
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
        // Cypress support files moved to `tests/support/e2e/` in Phase 5; they are Cypress's,
        // not Vitest's, so both locations leave the vitest block.
        ignores: ['tests/e2e/**/*', 'tests/support/e2e/**/*'],
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: ['./tsconfig.vitest.json']
            }
        }
    },
    {
        ...pluginCypress.configs.recommended,
        files: [
            'tests/e2e/specs/**/*.{cy,spec}.{js,ts,jsx,tsx}',
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
