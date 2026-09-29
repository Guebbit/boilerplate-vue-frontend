#!/usr/bin/env tsx
/*
 * Emits the response-schema ROUTE table (FA55) from `openapi.yaml`: one row per operation, giving
 * `infrastructure/http/response-schema-map.ts` and every module's own `response-schemas.ts` the
 * method, an anchored URL pattern, the `@api/schemas` export name for its response envelope, and
 * the `x-module` owner (the backend's `scripts/contracts/openapi-bundle.ts`) — the same source
 * `generate-operation-modules.ts` already reads for `OPERATION_MODULES`.
 *
 * Carries NO import of `@api/schemas` itself, on purpose: `response-schema-map.ts` needs this
 * table BEFORE the ~350 KB zod chunk (FA94/FA-D2) has loaded, and a module's own
 * `response-schemas.ts` is lazy-loaded as a whole — either way, `schemaName` stays a bare string
 * here and is resolved against the real schemas namespace only once that namespace is in hand.
 *
 * A row's pattern is fully anchored (`^…$`), which stops a `[^/]+` segment absorbing an adjacent
 * literal one at a DIFFERENT depth. It does NOT stop one at the SAME depth: `/products/{id}` and
 * `/products/categories` both match `GET /products/categories`, and `resolveResponseSchema`'s
 * `find()` returns whichever row comes first. So every row with FEWER `{param}` segments sorts
 * before a same-method sibling with more — the literal, more specific shape wins — exactly the
 * order five hand-written files already enforced one pair at a time before this generator existed
 * (`/products/categories`, `/cart/all`, `/cart/shipping-method`, `/account/oauth/providers`,
 * `/locales/tenants`).
 *
 * `--check` compares against the committed file and exits 1 on a mismatch — the same contract
 * every generator in this family keeps.
 *
 * Usage: tsx scripts/contracts/generate-route-table.ts --out <path> [--check]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

/** As much of an OpenAPI operation as this generator reads. */
interface OpenApiOperation {
    operationId?: string;
    requestBody?: { content?: Record<string, unknown> };
    'x-module'?: string;
}

interface OpenApiDocument {
    paths?: Record<string, Record<string, unknown>>;
}

/** The repo root. `import.meta.url` rather than `__dirname`: this script runs as ESM. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The bundled root contract this generator reads — the backend's, synced across as-is. */
const INPUT = path.resolve(ROOT, 'openapi.yaml');

/*
 * Reads the required `--out` argument.
 *
 * @returns Absolute path of the file to generate.
 */
const resolveOutputPath = (): string => {
    const flagIndex = process.argv.indexOf('--out');
    const value = flagIndex === -1 ? undefined : process.argv[flagIndex + 1];
    if (!value) {
        console.error('Missing required argument: --out <path>');
        process.exit(1);
    }
    return path.resolve(ROOT, value);
};

const OUTPUT = resolveOutputPath();

/** `--check` compares and reports; without it the file is written. */
const checkOnly = process.argv.includes('--check');

/** The HTTP methods an OpenAPI path item may hold. */
const OPERATION_METHODS = ['get', 'put', 'post', 'patch', 'delete', 'head', 'options', 'trace'];

/** Narrows a path-item entry to the fields this generator reads. */
const isOperation = (value: unknown): value is OpenApiOperation =>
    typeof value === 'object' && value !== null;

/** Regex metacharacters a literal path segment might contain, escaped so it matches itself. */
const REGEX_METACHARACTERS = /[$()*+.?[\\\]^{|}]/g;

/**
 * One `{param}` segment becomes `[^/]+` — the map matches a SEGMENT, never the param's own name.
 * A literal segment is escaped, then every row is joined on an explicit `\/`, since an
 * unescaped `/` would otherwise close the regex LITERAL this generator writes out as text.
 *
 * @param segment One `/`-delimited piece of an OpenAPI path template.
 * @returns That segment's own regex source, unescaped-slash-free.
 */
const segmentToPatternSource = (segment: string): string =>
    /^{[^}]+}$/.test(segment) ? '[^/]+' : segment.replaceAll(REGEX_METACHARACTERS, String.raw`\$&`);

/**
 * An OpenAPI path template, anchored at both ends — see this file's own header for why anchoring
 * both ends is what makes registration order irrelevant.
 *
 * @param openApiPath An OpenAPI `paths` key, e.g. `/orders/{id}/invoice`.
 * @returns The regex SOURCE (no `/…/` delimiters) matching exactly that shape.
 */
const pathToPatternSource = (openApiPath: string): string =>
    `^${openApiPath
        .split('/')
        .map((segment) => segmentToPatternSource(segment))
        .join(String.raw`\/`)}$`;

/**
 * The `@api/schemas` export name for one operation's response envelope — verified 1:1 against
 * every operation this contract declares (`PascalCase(operationId) + 'Response'`, orval's own
 * rule, no exceptions today).
 *
 * @param operationId An operation's declared id, e.g. `listOrders`.
 * @returns e.g. `ListOrdersResponse`.
 */
const schemaNameFor = (operationId: string): string =>
    `${operationId.charAt(0).toUpperCase()}${operationId.slice(1)}Response`;

/**
 * The `@api/schemas` export name for one operation's JSON request body — orval's own
 * `PascalCase(operationId) + 'Body'`, emitted only for an operation that declares a JSON body.
 * A multipart-only or bodyless operation has none, so `undefined`.
 *
 * @param operation One OpenAPI operation, already narrowed.
 * @returns e.g. `UpdateAccountBody`, or `undefined` when the operation sends no JSON body.
 */
const bodySchemaNameFor = (operation: OpenApiOperation): string | undefined => {
    const contentTypes = Object.keys(operation.requestBody?.content ?? {});
    return contentTypes.some((type) => type.includes('json')) && operation.operationId
        ? `${operation.operationId.charAt(0).toUpperCase()}${operation.operationId.slice(1)}Body`
        : undefined;
};

/** One row this generator emits — {@link GeneratedRoute}'s own shape, before it is rendered. */
interface Row {
    method: string;
    patternSource: string;
    paramCount: number;
    schemaName: string;
    bodySchemaName: string | undefined;
    moduleName: string | undefined;
}

const document = parse(readFileSync(INPUT, 'utf8')) as OpenApiDocument;

const rows: Row[] = [];
for (const [openApiPath, pathItem] of Object.entries(document.paths ?? {}))
    for (const method of OPERATION_METHODS) {
        const operation = pathItem[method];
        if (!isOperation(operation) || !operation.operationId) continue;

        rows.push({
            method: method.toUpperCase(),
            patternSource: pathToPatternSource(openApiPath),
            paramCount: openApiPath.split('/').filter((segment) => /^{[^}]+}$/.test(segment))
                .length,
            schemaName: schemaNameFor(operation.operationId),
            bodySchemaName: bodySchemaNameFor(operation),
            moduleName: operation['x-module']
        });
    }

// `paramCount` ascending first — see this file's own header for why a literal segment must sort
// before a `{param}` sibling that would otherwise absorb it. Everything else is alphabetical, for
// a stable, reviewable diff: a regeneration that adds an unrelated operation elsewhere must not
// reshuffle rows a reviewer already read.
rows.sort(
    (a, b) =>
        a.paramCount - b.paramCount ||
        a.patternSource.localeCompare(b.patternSource) ||
        a.method.localeCompare(b.method)
);

const renderRow = (row: Row): string =>
    `    { method: ${JSON.stringify(row.method)}, pattern: /${row.patternSource}/, schemaName: ${JSON.stringify(row.schemaName)}, bodySchemaName: ${row.bodySchemaName ? JSON.stringify(row.bodySchemaName) : 'undefined'}, module: ${row.moduleName ? JSON.stringify(row.moduleName) : 'undefined'} },`;

const output =
    '// Code generated by `npm run gen:api`. DO NOT EDIT.\n' +
    '/*\n' +
    ' * GENERATED — do not edit manually.\n' +
    ' * Source: openapi.yaml  |  Regenerate: npm run gen:api\n' +
    ' */\n\n' +
    '/**\n' +
    " * One operation's response-validation row (FA55) — the shape\n" +
    " * `src/infrastructure/http/response-schema-map.ts`'s `ResponseSchemaRoute` is resolved into,\n" +
    ' * once `schemaName` is looked up against the real `@api/schemas` namespace. `module` is the\n' +
    " * backend's `x-module` stamp — `undefined` for the handful of system endpoints no module owns.\n" +
    ' */\n' +
    'export interface GeneratedRoute {\n' +
    '    method: string;\n' +
    '    pattern: RegExp;\n' +
    '    schemaName: string;\n' +
    '    bodySchemaName: string | undefined;\n' +
    '    module: string | undefined;\n' +
    '}\n\n' +
    '/** Every operation this contract declares, response-schema row shape — see {@link GeneratedRoute}. */\n' +
    `export const ROUTES: GeneratedRoute[] = [\n${rows.map((row) => renderRow(row)).join('\n')}\n];\n`;

if (!checkOnly) {
    writeFileSync(OUTPUT, output, 'utf8');
    console.log(`✓ Generated ${OUTPUT}`);
} else if (existsSync(OUTPUT) && readFileSync(OUTPUT, 'utf8') === output) {
    console.log(`✓ ${OUTPUT} is current with openapi.yaml`);
} else {
    console.error(
        `${OUTPUT} is not what openapi.yaml generates.\n` +
            `  Run: npm run gen:api\n` +
            `  Then commit the result.`
    );
    process.exit(1);
}
