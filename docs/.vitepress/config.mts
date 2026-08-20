import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(
    defineConfig({
        title: 'Boilerplate Vue Frontend',
        description: 'ADHD-friendly docs for the Vue 3 + Pinia + Vue Router SPA boilerplate',
        themeConfig: {
            search: {
                provider: 'local'
            },
            nav: [
                { text: 'Home', link: '/' },
                { text: 'Getting Started', link: '/getting-started' },
                { text: 'Theory', link: '/theory/' },
                { text: 'Modules', link: '/modules/' },
                { text: 'Tools', link: '/tools/' },
                { text: 'API', link: '/api/' },
                { text: 'Files', link: '/reference/' }
            ],
            sidebar: {
                '/theory/': [
                    {
                        text: 'Theory',
                        items: [
                            { text: 'Overview', link: '/theory/' },
                            { text: 'Reading Path', link: '/theory/reading-path' },
                            { text: 'Architecture', link: '/theory/architecture' },
                            { text: 'Layers', link: '/theory/layers' },
                            { text: 'Modules', link: '/theory/modules' },
                            {
                                text: 'Adding & Removing a Module',
                                link: '/theory/module-lifecycle'
                            },
                            { text: 'Domain Layer', link: '/theory/domain-layer' },
                            { text: 'Strategic DDD', link: '/theory/strategic-ddd' },
                            { text: 'Glossary', link: '/theory/glossary' },
                            { text: 'Request Flow', link: '/theory/request-flow' },
                            { text: 'Sitemap & Access Control', link: '/theory/sitemap' },
                            { text: 'Roadmap', link: '/theory/roadmap' }
                        ]
                    }
                ],
                '/modules/': [
                    {
                        text: 'Overview',
                        items: [{ text: 'The whole map', link: '/modules/' }]
                    },
                    {
                        text: 'core',
                        collapsed: false,
                        items: [
                            {
                                text: 'cart',
                                link: '/modules/cart',
                                items: [
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
                            { text: 'payments', link: '/modules/payments' },
                            { text: 'wishlist', link: '/modules/wishlist' }
                        ]
                    },
                    {
                        text: 'generic',
                        collapsed: false,
                        items: [
                            { text: 'account', link: '/modules/account' },
                            {
                                text: 'admin',
                                link: '/modules/admin',
                                items: [
                                    { text: 'The dashboard', link: '/modules/admin-dashboard' }
                                ]
                            },
                            { text: 'demo', link: '/modules/demo' },
                            { text: 'feedback', link: '/modules/feedback' },
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
                            { text: 'realtime', link: '/modules/realtime' },
                            { text: 'users', link: '/modules/users' }
                        ]
                    }
                ],
                '/tools/': [
                    {
                        text: 'Overview',
                        items: [
                            { text: 'Overview', link: '/tools/' },
                            { text: 'Tools Explained', link: '/tools/tools-explained' }
                        ]
                    },
                    {
                        text: 'Setup',
                        collapsed: false,
                        items: [
                            { text: 'Package Dependencies', link: '/tools/package-dependencies' },
                            { text: 'Package Scripts', link: '/tools/package-scripts' },
                            { text: 'Environment Variables', link: '/tools/environment' },
                            { text: 'Runtime', link: '/tools/runtime' },
                            { text: 'Internationalisation', link: '/tools/i18n' },
                            { text: 'Docker & Podman', link: '/tools/docker-and-podman' },
                            { text: 'Security', link: '/tools/security' }
                        ]
                    },
                    {
                        text: 'Framework',
                        collapsed: false,
                        items: [
                            { text: 'State & Routing', link: '/tools/state-and-routing' },
                            { text: 'Realtime', link: '/tools/realtime' }
                        ]
                    },
                    {
                        text: 'Observability',
                        collapsed: false,
                        items: [
                            { text: 'Observability', link: '/tools/observability' },
                            { text: 'Admin Dashboard', link: '/tools/admin-dashboard' },
                            { text: 'Umami', link: '/tools/umami' }
                        ]
                    },
                    {
                        text: 'Testing & Mocking',
                        collapsed: false,
                        items: [
                            { text: 'Testing (overview)', link: '/tools/testing-and-docs' },
                            { text: 'Unit Testing', link: '/tools/unit-testing' },
                            { text: 'Testing — Quick Start', link: '/tools/testing-quickstart' },
                            { text: 'The demo profile', link: '/tools/demo-profile' },
                            { text: 'Live E2E (FE ↔ real backend)', link: '/tools/live-e2e' },
                            { text: 'Component Testing', link: '/tools/component-testing' },
                            { text: 'Property Testing', link: '/tools/property-testing' },
                            { text: 'Accessibility Testing', link: '/tools/accessibility-testing' },
                            { text: 'Visual Regression', link: '/tools/visual-regression' },
                            { text: 'Mutation Testing', link: '/tools/mutation-testing' }
                        ]
                    }
                ],
                '/reference/': [
                    {
                        text: 'File Glossary',
                        items: [
                            { text: 'Overview', link: '/reference/' },
                            { text: 'Repository Root', link: '/reference/root' },
                            { text: 'App, Kernel & Types', link: '/reference/src-app' },
                            { text: 'Infrastructure', link: '/reference/src-infrastructure' },
                            { text: 'Modules', link: '/reference/src-modules' },
                            { text: 'UI Kit', link: '/reference/src-ui' },
                            { text: 'Contracts', link: '/reference/contracts' },
                            { text: 'Scripts & Hooks', link: '/reference/scripts' },
                            { text: 'Tests', link: '/reference/tests' },
                            { text: 'Ops & Assets', link: '/reference/ops' }
                        ]
                    }
                ],
                '/api/': [
                    {
                        text: 'API',
                        items: [
                            { text: 'Overview', link: '/api/' },
                            { text: 'Endpoints', link: '/api/endpoints' },
                            { text: 'Observability Endpoints', link: '/api/observability' },
                            { text: 'OpenAPI Workflow', link: '/api/openapi-workflow' },
                            { text: 'AsyncAPI Workflow', link: '/api/asyncapi-workflow' }
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
        },
        mermaid: {
            theme: 'neutral',
            useMaxWidth: true,
            htmlLabels: true,
            flowchart: {
                nodeSpacing: 45,
                rankSpacing: 70,
                padding: 15
            },
            themeVariables: {
                primaryColor: '#f5f3ff',
                primaryBorderColor: '#7c3aed',
                primaryTextColor: '#111827',
                secondaryColor: '#eff6ff',
                secondaryBorderColor: '#2563eb',
                tertiaryColor: '#ecfeff',
                tertiaryBorderColor: '#0891b2',
                clusterBkg: '#f8fafc',
                clusterBorder: '#cbd5e1',
                lineColor: '#64748b'
            }
        }
    })
);
