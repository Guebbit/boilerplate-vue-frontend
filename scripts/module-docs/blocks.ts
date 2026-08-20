/**
 * Every generated block of a module page, rendered from `ModuleFacts`.
 *
 * One function per block, each returning the markdown between its markers. Blocks never explain a
 * mechanism — that is what `docs/theory/`, `docs/tools/` and `docs/api/` are for — they state what
 * THIS module does and link out for what the thing is.
 *
 * Mirrors the backend's blocks on the idea rather than the shape: **State** is a store instead of a
 * collection, **Screens** are routes instead of endpoints, and **Wiring** is the calls this client
 * makes instead of the signals a server emits.
 *
 * See: docs/modules/index.md
 */

import type { ModuleFacts } from './facts';
import { BACKEND_PAIRING } from './pairing';
import { subPagesOf } from './subpages';

/** What each subdomain label means, in the half-sentence a table cell can hold. */
const SUBDOMAIN_GLOSS: Partial<Record<string, string>> = {
    core: 'The reason the product exists. Worth its own client-side rules.',
    supporting: 'Specific to this business but not a differentiator. Kept plain.',
    generic: 'A solved problem. Modelling effort here would be waste.'
};

/** Mermaid arrow per relationship, so an edge's kind is readable without a legend beside it. */
const ARROW: Partial<Record<string, string>> = {
    conformist: '-->',
    'customer-supplier': '==>',
    'published-language': '-.->'
};

/** Mermaid class per subdomain. Declared once here and emitted into every diagram. */
const CLASS_DEFS = [
    'classDef core fill:#ede9fe,stroke:#7c3aed,color:#111827;',
    'classDef supporting fill:#dbeafe,stroke:#2563eb,color:#111827;',
    'classDef generic fill:#ccfbf1,stroke:#0f766e,color:#111827;',
    'classDef self fill:#fef3c7,stroke:#d97706,color:#111827,stroke-width:2px;'
];

/** A mermaid-safe node id — module names may carry hyphens, which mermaid reads as an edge. */
const nodeId = (name: string): string => name.replaceAll('-', '_');

/** Wrap rows in a markdown table, or return the empty-state line when there are none. */
const table = (headers: string[], rows: string[][], empty: string): string => {
    if (rows.length === 0) return empty;
    return [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.join(' | ')} |`)
    ].join('\n');
};

/** Backtick a value, or an em dash when there is nothing to show. */
const code = (value?: string): string => (value ? `\`${value}\`` : '—');

/** Backtick every member of a list, or an em dash when it is empty. */
const codeList = (values: string[]): string =>
    values.length > 0 ? values.map((value) => `\`${value}\``).join(' · ') : '—';

/** Block 1 — the identity card: what this is, in facts that fit on one screen. */
export const identityBlock = (facts: ModuleFacts): string => {
    const pairing = BACKEND_PAIRING[facts.name];
    const counterpart = pairing?.counterparts.length
        ? `${pairing.counterparts.map((name) => `\`${name}\``).join(' + ')} in \`boilerplate-node-backend\``
        : '_none_';

    const rows: string[][] = [
        ['**Subdomain**', `\`${facts.subdomain}\` — ${SUBDOMAIN_GLOSS[facts.subdomain] ?? ''}`],
        [
            '**Screens**',
            facts.routes.length > 0
                ? `${facts.routes.length} — ${facts.routes.map((route) => `\`${route.name}\``).join(' · ')}`
                : '_none_ — this module routes to nothing'
        ],
        ['**Store**', facts.store ? `\`${facts.store.id}\`` : '_none_ — holds no state of its own'],
        [
            '**Menu entries**',
            facts.navigation.length > 0
                ? facts.navigation
                      .map((entry) => `\`${entry.routeName}\`${entry.badge ? ' (with badge)' : ''}`)
                      .join(' · ')
                : '_none_'
        ],
        ['**API calls**', facts.apiCalls.length > 0 ? String(facts.apiCalls.length) : '_none_'],
        [
            '**Depends on**',
            facts.dependsOn.length > 0
                ? facts.dependsOn
                      .map((edge) => `[\`${edge.module}\`](./${edge.module}.md)`)
                      .join(' · ')
                : '_nothing_'
        ],
        [
            '**Depended on by**',
            facts.dependents.length > 0
                ? facts.dependents
                      .map((edge) => `[\`${edge.from}\`](./${edge.from}.md)`)
                      .join(' · ')
                : '_nothing_'
        ],
        ['**Languages**', codeList(facts.locales)],
        [
            '**Publishes**',
            facts.published.length > 0
                ? codeList(facts.published)
                : '_nothing_ — no barrel, so no sibling may import it'
        ],
        ['**Backend counterpart**', pairing?.why ? `${counterpart} — ${pairing.why}` : counterpart]
    ];

    const orphan = facts.dependsOn.length === 0 && facts.dependents.length === 0;

    return [
        table(['Fact', 'This module'], rows, ''),
        orphan
            ? '\n::: info Stands alone\nNo module depends on this one and it depends on none. Deleting the folder and its line in `src/modules.ts` costs nothing else.\n:::'
            : ''
    ]
        .filter(Boolean)
        .join('\n');
};

/** Block 2 — the context map: this module centred, with both directions of every edge. */
export const mapBlock = (facts: ModuleFacts, all: ModuleFacts[]): string => {
    const subdomainOf = new Map(all.map((entry) => [entry.name, entry.subdomain]));
    const involved = new Set<string>([
        ...facts.dependsOn.map((edge) => edge.module),
        ...facts.dependents.map((edge) => edge.from)
    ]);

    if (involved.size === 0)
        return `\`${facts.name}\` sits on no edge of the context map — nothing imports it and it imports nothing.`;

    const lines = [
        "%%{init: {'flowchart': {'nodeSpacing': 45, 'rankSpacing': 75}}}%%",
        'flowchart LR'
    ];

    for (const edge of facts.dependents)
        lines.push(
            `    ${nodeId(edge.from)}["${edge.from}"] ${ARROW[edge.as] ?? '-->'}|"${edge.as}"| ${nodeId(facts.name)}["<b>${facts.name}</b>"]`
        );
    for (const edge of facts.dependsOn)
        lines.push(
            `    ${nodeId(facts.name)}["<b>${facts.name}</b>"] ${ARROW[edge.as] ?? '-->'}|"${edge.as}"| ${nodeId(edge.module)}["${edge.module}"]`
        );

    lines.push('', ...CLASS_DEFS.map((line) => `    ${line}`));
    for (const subdomain of ['core', 'supporting', 'generic']) {
        const members = [...involved].filter((name) => subdomainOf.get(name) === subdomain);
        if (members.length > 0)
            lines.push(`    class ${members.map((name) => nodeId(name)).join(',')} ${subdomain};`);
    }
    lines.push(`    class ${nodeId(facts.name)} self;`);

    const reasons = [
        ...facts.dependents.map((edge) => `- \`${edge.from}\` → **${edge.as}** — ${edge.because}`),
        ...facts.dependsOn.map((edge) => `- → \`${edge.module}\` **${edge.as}** — ${edge.because}`)
    ];

    return ['```mermaid', ...lines, '```', '', ...reasons].join('\n');
};

/** Block 4 — the store's public surface: what this domain holds, and what moves it. */
export const stateBlock = (facts: ModuleFacts): string => {
    if (!facts.store)
        return 'This module owns no store. Whatever state its screens read belongs to a module it depends on, or to `src/infrastructure/stores/`.';

    const rows = [
        [
            '**State**',
            codeList(facts.store.state),
            'The refs the setup function returns — the only writable surface.'
        ],
        [
            '**Getters**',
            codeList(facts.store.getters),
            'Computed, derived from state. Read-only by construction.'
        ],
        [
            '**Actions**',
            codeList(facts.store.actions),
            'Everything that changes state or calls the API.'
        ]
    ];

    return [
        `Store \`${facts.store.id}\`, from \`store.ts\`. Only what the setup function returns is listed — an internal ref is not part of the surface.`,
        '',
        table(['Kind', 'Members', 'What it is'], rows, '')
    ].join('\n');
};

/** Block 5 — the screens this domain routes to, and who may reach them. */
export const screensBlock = (facts: ModuleFacts): string => {
    if (facts.routes.length === 0)
        return 'This module routes to nothing. It contributes components, schemas or a store to the modules that depend on it.';

    const rows = facts.routes.map((route) => [
        `${'↳ '.repeat(route.depth)}\`${route.path}\``,
        code(route.name),
        `\`${route.access}\``,
        code(route.view)
    ]);

    return [
        table(['Path', 'Route name', 'Access', 'View'], rows, ''),
        '',
        'Paths are relative to the localised root, so `cart` is served at `/:locale/cart`. **Access** is the route’s own `meta.access` — a menu entry never restates it, which is what keeps the menu and the router from disagreeing.'
    ].join('\n');
};

/** Block 6 — everything this module reaches outside itself. */
export const wiringBlock = (facts: ModuleFacts): string => {
    const sections: string[] = [];

    if (facts.apiCalls.length > 0)
        sections.push(
            '#### Endpoints called',
            '',
            table(
                ['Call', 'Response envelope'],
                facts.apiCalls.map((call) => [
                    `\`${call.method} ${call.pattern}\``,
                    `\`${call.schema}\``
                ]),
                ''
            ),
            '',
            'Each row registers one Zod envelope through the manifest, so enabling the domain turns its contract validation on and deleting the folder turns it off.'
        );

    if (facts.navigation.length > 0)
        sections.push(
            '#### Navigation entries',
            '',
            table(
                ['Route', 'Label key', 'Order', 'Badge'],
                facts.navigation.map((entry) => [
                    `\`${entry.routeName}\``,
                    `\`${entry.label}\``,
                    entry.order === undefined ? '_last_' : String(entry.order),
                    entry.badge ? 'yes' : '—'
                ]),
                ''
            )
        );

    if (facts.analyticsEvents.length > 0)
        sections.push(
            '#### Analytics events',
            '',
            table(
                ['Constant', 'Emitted from'],
                facts.analyticsEvents.map((name) => [`\`analyticsEvents.${name}\``, 'this module']),
                ''
            ),
            '',
            'The names themselves are declared in the backend, because both repositories write into one event namespace.'
        );

    return sections.length > 0
        ? sections.join('\n').replaceAll(/\n(#{4})/g, '\n\n$1')
        : 'This module calls no endpoint, contributes no menu entry and emits no analytics event. Whatever it does, it does through a module it depends on.';
};

/** Block 7 — every file in the folder, so nothing in the domain is unaccounted for. */
export const filesBlock = (facts: ModuleFacts): string =>
    table(
        ['File', 'What it is', 'Explained in'],
        facts.files.map((file) => [
            `\`${file.path}\``,
            file.what,
            file.reads ? `[read](${file.reads})` : '—'
        ]),
        '_This module folder is empty._'
    );

/** Block 8 — what is tested and how to run it. */
export const workingBlock = (facts: ModuleFacts): string => {
    const rows = [
        ['Vitest', String(facts.unitTests), `\`src/modules/${facts.name}/tests/\``],
        ['Cypress', String(facts.e2eTests), `\`src/modules/${facts.name}/tests/e2e/\``],
        [
            'Visual baselines',
            String(facts.snapshots),
            `\`src/modules/${facts.name}/tests/e2e/__snapshots__/\``
        ]
    ].filter((row) => row[1] !== '0');

    const commands = [
        '```bash',
        "# this module's vitest suites",
        `npm run test:unit -- ${facts.name}`
    ];
    if (facts.e2eTests)
        commands.push(
            '',
            "# this module's cypress suites",
            `npm run test:e2e -- --spec 'src/modules/${facts.name}/tests/e2e/*.cy.ts'`
        );
    if (facts.apiCalls.length > 0)
        commands.push(
            '',
            '# after the backend changes an endpoint this module calls',
            'npm run regenerate'
        );
    commands.push('```');

    return [
        table(['Suite', 'Files', 'Where'], rows, '_This module carries no tests of its own._'),
        '',
        ...commands
    ].join('\n');
};

/** Block 9a — the sub-pages this module has earned, or a line saying it needs none. */
export const subPagesBlock = (moduleName: string): string => {
    const pages = subPagesOf(moduleName);
    if (pages.length === 0)
        return 'Nothing in this domain needs a page of its own — the story above is the whole of it.';
    return pages.map((page) => `- [${page.title}](./${page.slug}.md)`).join('\n');
};
