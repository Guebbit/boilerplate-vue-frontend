import eslint from '@eslint/js';
import globals from 'globals';
import pluginUnicorn from 'eslint-plugin-unicorn';
import { globalIgnores } from 'eslint/config';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import pluginVitest from '@vitest/eslint-plugin';
import pluginCypress from 'eslint-plugin-cypress';
import pluginOxlint from 'eslint-plugin-oxlint';

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
        'eslint.config.ts',
        'public/mockServiceWorker.js',
        'tests/mocks/generated.ts'
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
            'no-console': 'warn',
            'no-debugger': 'warn',
            'vue/script-indent': 'off',
            'vue/multi-word-component-names': 'off',
            'vue/require-default-prop': 'off',
            'vue/no-v-html': 'off',

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
                {
                    selector: 'default',
                    format: ['camelCase', 'PascalCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'allow'
                },
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE'],
                    leadingUnderscore: 'allow',
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
                    leadingUnderscore: 'allow',
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

    /**
     * Architectural boundaries:
     * - cross-feature imports must go through `@/features/<feature>` public entries
     * - pages/views cannot call the generated API directly
     * - entities stay independent from app/features/pages layers
     */
    {
        files: ['src/features/**/*.{ts,vue}', 'src/router/**/*.ts', 'src/views/**/*.vue'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/features/*/*'],
                            message:
                                'Use the feature public entry (`@/features/<feature>`) or a relative import inside the same feature.'
                        }
                    ]
                }
            ]
        }
    },
    {
        files: ['src/views/**/*.vue', 'src/features/**/views/**/*.vue'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@api',
                            message:
                                'Views/pages must not call generated API functions directly. Route API calls through feature stores/composables.'
                        }
                    ],
                    patterns: [
                        {
                            group: ['@api/*', '@/features/*/*'],
                            message:
                                'Views/pages must not deep-import feature internals or generated API modules.'
                        }
                    ]
                }
            ]
        }
    },
    {
        files: ['src/entities/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@/features/*',
                                '@/features/*/*',
                                '@/views/*',
                                '@/stores/*',
                                '@/router/*'
                            ],
                            message:
                                'Entities must remain framework/app independent and cannot depend on features, pages, stores, or router.'
                        }
                    ]
                }
            ]
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
        files: ['tests/**/*', '**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'],
        rules: {
            'unicorn/filename-case': 'off',
            'unicorn/prevent-abbreviations': 'off'
        }
    },
    {
        files: ['scripts/**/*.ts'],
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
        ignores: ['tests/e2e/**/*'],
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
            'tests/e2e/support/**/*.{js,ts,jsx,tsx}'
        ],
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: ['./tsconfig.cypress.json']
            }
        }
    }
);
