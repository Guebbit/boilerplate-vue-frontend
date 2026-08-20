/**
 * The blocks on `docs/modules/index.md` — the whole map, rather than one module's slice of it.
 *
 * See: docs/modules/index.md
 */

import type { ModuleFacts } from './facts';
import { BACKEND_PAIRING } from './pairing';

const ARROW: Partial<Record<string, string>> = {
    conformist: '-->',
    'customer-supplier': '==>',
    'published-language': '-.->'
};

const nodeId = (name: string): string => name.replaceAll('-', '_');

const table = (headers: string[], rows: string[][]): string =>
    [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.join(' | ')} |`)
    ].join('\n');

/** The legend every other diagram in this section obeys. */
export const legendBlock = (): string =>
    [
        '**Node fill — where the domain sits in the business.**',
        '',
        table(
            ['Fill', 'Subdomain', 'What it means'],
            [
                [
                    '🟪 violet',
                    '`core`',
                    'The reason the product exists. Worth its own client-side rules.'
                ],
                [
                    '🟦 blue',
                    '`supporting`',
                    'Specific to this business but not a differentiator. Kept plain.'
                ],
                [
                    '🟩 teal',
                    '`generic`',
                    'A solved problem. Modelling effort here is waste — a `domain/` folder inside one fails `tests/cross-cutting/subdomain-discipline.spec.ts`.'
                ]
            ]
        ),
        '',
        '::: warning Read `core` with one caveat, on a client',
        'This application owns almost none of the domain it displays. Prices, totals, eligibility and',
        'permissions are all decided server-side, so `core` here marks **where the screens and the',
        'client-side rules are load-bearing**, not where the business logic lives.',
        ':::',
        '',
        '**Arrow style — what kind of relationship the edge is.**',
        '',
        table(
            ['Arrow', 'Relationship', 'What crosses the edge'],
            [
                [
                    '`-->` thin',
                    '`conformist`',
                    'Reads another module’s store as it is, with no translation and no say in its shape.'
                ],
                [
                    '`==>` thick',
                    '`customer-supplier`',
                    'Calls a sibling’s store to make something happen, and that sibling’s surface is shaped by the demand.'
                ],
                [
                    '`-.->` dashed',
                    '`published-language`',
                    'Receives vocabulary rather than state — a Zod schema, a pure function, or a self-contained component. The strongest edge.'
                ]
            ]
        ),
        '',
        '::: info `shared-kernel` is absent, and that is a finding',
        'The backend has one: `account → users`, because both write the same User record. Here the same',
        'pair is `published-language`, because this client shares only the validation vocabulary and the',
        'server remains the single writer. That divergence is what',
        '[Domain layer](../theory/domain-layer.md) means by the domain living behind the API.',
        ':::',
        '',
        'Every diagram under `/modules/` uses this and only this. Since the diagrams are generated, obedience is free.'
    ].join('\n');

/** The whole context map, subdomains as subgraphs so the three tiers read at a glance. */
export const overviewMapBlock = (all: ModuleFacts[]): string => {
    const lines = [
        '```mermaid',
        "%%{init: {'flowchart': {'nodeSpacing': 30, 'rankSpacing': 80}}}%%",
        'flowchart LR'
    ];

    for (const subdomain of ['core', 'supporting', 'generic']) {
        const members = all.filter((facts) => facts.subdomain === subdomain);
        if (members.length === 0) continue;
        lines.push(
            `    subgraph ${subdomain.toUpperCase()}["${subdomain}"]`,
            '        direction TB'
        );
        for (const facts of members) lines.push(`        ${nodeId(facts.name)}["${facts.name}"]`);
        lines.push('    end');
    }

    for (const facts of all)
        for (const edge of facts.dependsOn)
            lines.push(
                `    ${nodeId(facts.name)} ${ARROW[edge.as] ?? '-->'} ${nodeId(edge.module)}`
            );

    lines.push(
        '',
        '    classDef core fill:#ede9fe,stroke:#7c3aed,color:#111827;',
        '    classDef supporting fill:#dbeafe,stroke:#2563eb,color:#111827;',
        '    classDef generic fill:#ccfbf1,stroke:#0f766e,color:#111827;'
    );
    for (const subdomain of ['core', 'supporting', 'generic']) {
        const members = all.filter((facts) => facts.subdomain === subdomain);
        if (members.length > 0)
            lines.push(
                `    class ${members.map((facts) => nodeId(facts.name)).join(',')} ${subdomain};`
            );
    }
    lines.push(
        '    style CORE fill:#faf8ff,stroke:#cbd5e1',
        '    style SUPPORTING fill:#f8fafc,stroke:#cbd5e1',
        '    style GENERIC fill:#f8fdfc,stroke:#cbd5e1',
        '```'
    );

    return lines.join('\n');
};

/** One row per module: the answer to "which one is this?" without opening a page. */
export const matrixBlock = (all: ModuleFacts[]): string =>
    table(
        ['Module', 'Subdomain', 'Screens', 'Store', 'API calls', 'Depends on', 'Depended on by'],
        all.map((facts) => [
            `[\`${facts.name}\`](./${facts.name}.md)`,
            `\`${facts.subdomain}\``,
            String(facts.routes.length),
            facts.store ? `\`${facts.store.id}\`` : '—',
            String(facts.apiCalls.length),
            String(facts.dependsOn.length),
            String(facts.dependents.length)
        ])
    );

/** The cross-repository pairing, including the modules that have no counterpart. */
export const pairingBlock = (all: ModuleFacts[]): string =>
    table(
        ['This repository', 'boilerplate-node-backend', 'Note'],
        all.map((facts) => {
            const pairing = BACKEND_PAIRING[facts.name];
            const counterparts = pairing?.counterparts.length
                ? pairing.counterparts.map((name) => `\`${name}\``).join(' + ')
                : '_none_';
            return [`[\`${facts.name}\`](./${facts.name}.md)`, counterparts, pairing?.why ?? '—'];
        })
    );

/** Counts, so the shape of the system is one line rather than a count of table rows. */
export const tallyBlock = (all: ModuleFacts[]): string => {
    const by = (subdomain: string): number =>
        all.filter((facts) => facts.subdomain === subdomain).length;

    return table(
        ['Modules', 'core', 'supporting', 'generic', 'Screens', 'Stores', 'Context edges'],
        [
            [
                String(all.length),
                String(by('core')),
                String(by('supporting')),
                String(by('generic')),
                String(all.reduce((total, facts) => total + facts.routes.length, 0)),
                String(all.filter((facts) => facts.store).length),
                String(all.reduce((total, facts) => total + facts.dependsOn.length, 0))
            ]
        ]
    );
};

/**
 * Every screen in the application, in one table — the block on `docs/theory/sitemap.md`.
 *
 * Generated from the same route records the module pages read, so the sitemap and fourteen module
 * pages cannot disagree about what the application serves.
 */
export const sitemapBlock = (all: ModuleFacts[]): string => {
    const rows = all.flatMap((facts) =>
        facts.routes.map((route) => [
            `[\`${facts.name}\`](../modules/${facts.name}.md)`,
            `\`${'  '.repeat(route.depth)}${route.path}\``,
            `\`${route.name}\``,
            `\`${route.access}\``,
            `\`${route.view}\``
        ])
    );

    return [
        table(['Module', 'Path', 'Route name', 'Access', 'View'], rows),
        '',
        `${rows.length} screens across ${all.filter((facts) => facts.routes.length).length} modules. ` +
            'Paths are relative to the localised root. **Access** is the route’s own `meta.access`, ' +
            'which is the only place a permission is declared — a menu entry inherits it rather than ' +
            'restating it.'
    ].join('\n');
};
