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
                { text: 'Theory', link: '/theory/' },
                { text: 'Tools', link: '/tools/' },
                { text: 'API', link: '/api/' }
            ],
            sidebar: {
                '/theory/': [
                    {
                        text: 'Theory',
                        items: [
                            { text: 'Overview', link: '/theory/' },
                            { text: 'Architecture', link: '/theory/architecture' },
                            { text: 'Layers', link: '/theory/layers' },
                            { text: 'Request Flow', link: '/theory/request-flow' },
                            { text: 'Sitemap & Access Control', link: '/theory/sitemap' }
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
                            { text: 'Runtime', link: '/tools/runtime' },
                            { text: 'Security', link: '/tools/security' }
                        ]
                    },
                    {
                        text: 'Framework',
                        collapsed: false,
                        items: [
                            { text: 'State & Routing', link: '/tools/state-and-routing' },
                            { text: 'Realtime', link: '/tools/websockets' }
                        ]
                    },
                    {
                        text: 'Observability',
                        collapsed: false,
                        items: [
                            { text: 'Observability', link: '/tools/observability' },
                            { text: 'Umami', link: '/tools/umami' }
                        ]
                    },
                    {
                        text: 'Testing & Mocking',
                        collapsed: false,
                        items: [
                            { text: 'Testing', link: '/tools/testing-and-docs' },
                            { text: 'Mocking (MSW)', link: '/tools/mocking' }
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
