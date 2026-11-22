import { defineConfig } from 'vitepress';

/**
 * Aliases that point Mermaid's CommonJS-only helpers at their ESM builds, so `docs:dev` can
 * bundle them. Same list the retired `vitepress-plugin-mermaid` carried.
 */
const mermaidAliases = {
    'dayjs/plugin/advancedFormat.js': 'dayjs/esm/plugin/advancedFormat',
    'dayjs/plugin/customParseFormat.js': 'dayjs/esm/plugin/customParseFormat',
    'dayjs/plugin/isoWeek.js': 'dayjs/esm/plugin/isoWeek',
    'cytoscape/dist/cytoscape.umd.js': 'cytoscape/dist/cytoscape.esm.js'
};

export default defineConfig({
    title: 'Boilerplate Vue Frontend',
    lastUpdated: true,
    description: 'ADHD-friendly docs for the Vue 3 + Pinia + Vue Router SPA boilerplate',
    markdown: {
        // markdown-it fence rule: a ```mermaid block becomes our component, any other
        // fence keeps the original renderer.
        // https://vitepress.dev/guide/markdown#advanced-configuration
        config(md) {
            const original = md.renderer.rules.fence;
            md.renderer.rules.fence = (tokens, index, options, environment, self) => {
                const token = tokens[index];
                if (token?.info.trim() === 'mermaid')
                    return `<MermaidDiagram code="${encodeURIComponent(token.content)}" />`;
                return original
                    ? original(tokens, index, options, environment, self)
                    : self.renderToken(tokens, index, options);
            };
        }
    },
    vite: {
        optimizeDeps: {
            include: [
                '@braintree/sanitize-url',
                'dayjs',
                'debug',
                'cytoscape-cose-bilkent',
                'cytoscape'
            ]
        },
        resolve: { alias: mermaidAliases }
    },
    themeConfig: {
        search: {
            provider: 'local'
        },
        nav: [
            { text: 'Home', link: '/' },
            {
                text: 'Use the Shop',
                link: 'https://github.com/Guebbit/boilerplate-node-backend/blob/main/docs/use-the-shop/start.md'
            },
            { text: 'Understand', link: '/understand/start' },
            { text: 'Build', link: '/build/start' },
            { text: 'Modules', link: '/modules/start' },
            { text: 'Operate', link: '/operate/start' },
            { text: 'Reference', link: '/reference/start' }
        ],
        sidebar: {
            '/understand/': [
                {
                    text: 'The shape',
                    items: [
                        { text: 'Overview', link: '/understand/start' },
                        { text: 'Reading Path', link: '/understand/reading-path' },
                        { text: 'Architecture', link: '/understand/architecture' },
                        {
                            text: 'Layers',
                            link: '/understand/layers',
                            items: [
                                {
                                    text: 'Layers: decisions',
                                    link: '/understand/layers-decisions'
                                }
                            ]
                        },
                        {
                            text: 'Modules',
                            link: '/understand/modules',
                            items: [
                                {
                                    text: 'Adding and deleting a domain',
                                    link: '/understand/modules-adding-and-deleting'
                                }
                            ]
                        },
                        {
                            text: 'Domain layer & DDD',
                            link: '/understand/domain-layer',
                            items: [{ text: 'What DDD is', link: '/understand/domain-layer-ddd' }]
                        },
                        { text: 'Strategic DDD', link: '/understand/strategic-ddd' },
                        {
                            text: 'Request Flow',
                            link: '/understand/request-flow',
                            items: [
                                {
                                    text: 'Cross-cutting strategies',
                                    link: '/understand/request-flow-strategies'
                                }
                            ]
                        },
                        { text: 'Loading State', link: '/understand/loading-state' },
                        { text: 'Sitemap & Access Control', link: '/understand/sitemap' },
                        { text: 'Roadmap', link: '/understand/roadmap' }
                    ]
                },
                {
                    text: 'Mechanisms',
                    items: [
                        { text: 'Tools', link: '/understand/tool-map' },
                        { text: 'Tools Explained', link: '/understand/tools-explained' },
                        { text: 'Runtime', link: '/understand/runtime' },
                        { text: 'State & Routing', link: '/understand/state-and-routing' },
                        { text: 'Realtime (SSE)', link: '/understand/realtime' },
                        { text: 'Internationalisation', link: '/understand/i18n' },
                        { text: 'Security', link: '/understand/security' },
                        { text: 'Web Attack Defences', link: '/understand/web-attack-defences' },
                        { text: 'Cookies and storage', link: '/understand/browser-storage' },
                        { text: 'Shared rules', link: '/understand/shared-rules' },
                        { text: 'Guided tours', link: '/understand/tours' }
                    ]
                },
                {
                    text: 'Design',
                    items: [
                        {
                            text: 'Design System',
                            link: '/understand/design-system',
                            items: [
                                {
                                    text: 'Touch and layout',
                                    link: '/understand/design-system-touch-and-layout'
                                }
                            ]
                        },
                        { text: 'Judging a Design', link: '/understand/design-judgement' }
                    ]
                }
            ],
            '/build/': [
                {
                    text: 'Run it',
                    items: [
                        { text: 'Overview', link: '/build/start' },
                        { text: 'Getting Started', link: '/build/run-locally' },
                        { text: 'The demo profile', link: '/build/demo-profile' },
                        { text: 'Docker & Podman', link: '/build/docker-and-podman' }
                    ]
                },
                {
                    text: 'Change it',
                    items: [
                        {
                            text: 'Adding & removing a module',
                            link: '/build/module-lifecycle',
                            items: [
                                {
                                    text: 'Removing a module',
                                    link: '/build/module-lifecycle-removing'
                                }
                            ]
                        },
                        { text: 'API', link: '/build/api-contracts' },
                        { text: 'OpenAPI Workflow', link: '/build/openapi-workflow' },
                        { text: 'AsyncAPI Workflow', link: '/build/asyncapi-workflow' }
                    ]
                },
                {
                    text: 'Test it',
                    items: [
                        {
                            text: 'Testing & Docs',
                            link: '/build/testing-and-docs',
                            items: [
                                { text: 'Timings and gates', link: '/build/testing-and-docs-gates' }
                            ]
                        },
                        { text: 'Testing — Quick Start', link: '/build/testing-quickstart' },
                        { text: 'Unit Testing', link: '/build/unit-testing' },
                        { text: 'Component Testing', link: '/build/component-testing' },
                        { text: 'Property Testing', link: '/build/property-testing' },
                        {
                            text: 'Live E2E',
                            link: '/build/live-e2e',
                            items: [{ text: 'Live E2E recipe', link: '/build/live-e2e-recipe' }]
                        },
                        { text: 'Lighthouse', link: '/build/lighthouse' },
                        {
                            text: 'Mutation Testing',
                            link: '/build/mutation-testing',
                            items: [
                                { text: 'Why a run is slow', link: '/build/mutation-testing-speed' }
                            ]
                        }
                    ]
                },
                {
                    text: 'Check the interface',
                    items: [
                        { text: 'Accessibility Testing', link: '/build/accessibility-testing' },
                        { text: 'Layout Sweep', link: '/build/layout-sweep' },
                        { text: 'Touch Testing', link: '/build/touch-testing' },
                        { text: 'Design Lint', link: '/build/design-lint' },
                        { text: 'Code Comments', link: '/build/code-comments' },
                        {
                            text: 'Visual Regression',
                            link: '/build/visual-regression',
                            items: [
                                {
                                    text: 'Determinism and baselines',
                                    link: '/build/visual-regression-determinism'
                                }
                            ]
                        },
                        { text: 'AI Auditing', link: '/build/ai-auditing' },
                        { text: 'Design Review', link: '/build/design-review' }
                    ]
                }
            ],
            '/modules/': [
                {
                    text: 'Overview',
                    items: [{ text: 'The whole map', link: '/modules/start' }]
                },
                {
                    text: 'core',
                    collapsed: false,
                    items: [
                        {
                            text: 'cart',
                            link: '/modules/cart',
                            items: [
                                { text: 'The guest cart', link: '/modules/cart-guest' },
                                { text: 'The checkout flow', link: '/modules/cart-checkout' }
                            ]
                        },
                        { text: 'orders', link: '/modules/orders' },
                        { text: 'products', link: '/modules/products' }
                    ]
                },
                {
                    text: 'supporting',
                    collapsed: false,
                    items: [
                        { text: 'delivery', link: '/modules/delivery' },
                        { text: 'inventory', link: '/modules/inventory' },
                        { text: 'notifications', link: '/modules/notifications' },
                        { text: 'payments', link: '/modules/payments' },
                        { text: 'returns', link: '/modules/returns' },
                        { text: 'shop', link: '/modules/shop' },
                        { text: 'shop-tasks', link: '/modules/shop-tasks' },
                        { text: 'stats', link: '/modules/stats' },
                        { text: 'stock-alerts', link: '/modules/stock-alerts' },
                        { text: 'webhooks', link: '/modules/webhooks' },
                        { text: 'wishlist', link: '/modules/wishlist' }
                    ]
                },
                {
                    text: 'generic',
                    collapsed: false,
                    items: [
                        { text: 'account', link: '/modules/account' },
                        { text: 'api-keys', link: '/modules/api-keys' },
                        {
                            text: 'example',
                            link: '/understand/modules#the-module-template'
                        },
                        { text: 'tasks', link: '/modules/tasks' },
                        {
                            text: 'locales',
                            link: '/modules/locales',
                            items: [
                                {
                                    text: 'Runtime overrides',
                                    link: '/modules/locales-overrides'
                                }
                            ]
                        },
                        {
                            text: 'observability',
                            link: '/modules/observability',
                            items: [
                                {
                                    text: 'The dashboard',
                                    link: '/modules/observability-dashboard'
                                }
                            ]
                        },
                        { text: 'users', link: '/modules/users' }
                    ]
                }
            ],
            '/operate/': [
                {
                    text: 'Operate',
                    items: [
                        { text: 'Overview', link: '/operate/start' },
                        { text: 'Environment Variables', link: '/operate/environment' },
                        { text: 'Observability', link: '/operate/observability' },
                        { text: 'Admin Dashboard', link: '/operate/admin-dashboard' },
                        { text: 'Umami', link: '/operate/umami' }
                    ]
                }
            ],
            '/reference/': [
                {
                    text: 'Look it up',
                    items: [
                        { text: 'Overview', link: '/reference/start' },
                        { text: 'Endpoints', link: '/reference/endpoints' },
                        { text: 'Contracts', link: '/reference/contracts' },
                        { text: 'Package Scripts', link: '/reference/package-scripts' },
                        { text: 'Package Dependencies', link: '/reference/package-dependencies' },
                        { text: 'Glossary', link: '/reference/glossary' }
                    ]
                },
                {
                    text: 'Files',
                    items: [
                        { text: 'Repository Root', link: '/reference/root' },
                        { text: 'App, Kernel & Types', link: '/reference/src-app' },
                        { text: 'Infrastructure', link: '/reference/src-infrastructure' },
                        { text: 'Modules', link: '/reference/src-modules' },
                        { text: 'UI Kit', link: '/reference/src-ui' },
                        { text: 'Scripts & Hooks', link: '/reference/scripts' },
                        { text: 'Tests', link: '/reference/tests' },
                        { text: 'E2E & Journeys', link: '/reference/tests-e2e' },
                        { text: 'Ops & Assets', link: '/reference/ops' }
                    ]
                }
            ]
        },
        socialLinks: [
            {
                icon: 'github',
                link: 'https://github.com/Guebbit/boilerplate-vue-frontend'
            }
        ]
    }
});
