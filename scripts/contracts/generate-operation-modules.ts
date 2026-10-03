#!/usr/bin/env tsx
/*
 * Emits a generated `@api` function name → owning BACKEND module map, from `openapi.yaml`'s
 * `x-module` stamps (the backend's `scripts/contracts/openapi-bundle.ts`).
 *
 * Nothing in the contract says which module owns an operation, so a lint or test
 * that wants to flag a module reaching for another domain's endpoint has nothing to check against.
 * This is that map, kept in sync with the contract instead of hand-written — `tests/cross-cutting/
 * module-coupling.spec.ts` reads it to compare an import against `MODULE_EDGES`.
 *
 * Compatible with orval's `mode: 'single'` output (`orval.config.ts`'s `api` block): one entry per
 * generated function name. Most operations keep their `operationId` unchanged, but the seven
 * accepting either JSON or multipart are split and renamed by `contentTypeOperationNames` in
 * `orval.config.ts` — mirrored below so a name in this map always matches the name orval actually
 * generated for it. A path with no `x-module` (the handful of system endpoints the root document
 * declares directly) contributes no entry — there is no module to attribute it to.
 *
 * `--check` compares against the committed file and exits 1 on a mismatch — the same contract
 * `generate-asyncapi-types.ts` keeps.
 *
 * Usage: tsx scripts/contracts/generate-operation-modules.ts --out <path> [--check]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

/** As much of an OpenAPI operation as this generator reads. */
interface OpenApiOperation {
    operationId?: string;
    'x-module'?: string;
    requestBody?: { content?: Record<string, unknown> };
}

/** The slice of the bundled OpenAPI document this generator reads. */
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

/** Absolute path of the file to generate, from `--out`. */
const OUTPUT = resolveOutputPath();

/** `--check` compares and reports; without it the file is written. */
const checkOnly = process.argv.includes('--check');

/** The HTTP methods an OpenAPI path item may hold. */
const OPERATION_METHODS = ['get', 'put', 'post', 'patch', 'delete', 'head', 'options', 'trace'];

/** Narrows a path-item entry to the fields this generator reads. */
const isOperation = (value: unknown): value is OpenApiOperation =>
    typeof value === 'object' && value !== null;

/*
 * The function name(s) orval settles on for one operation. Mirrors `contentTypeOperationNames` in
 * `orval.config.ts`: an operation with a single request content type keeps its plain
 * `operationId`; one accepting both JSON and multipart is split into the plain name (JSON keeps it)
 * and `<operationId>WithMultipart`. Keep this in step by hand if that transformer's rule ever
 * changes — the two are proven consistent by `tests/cross-cutting/module-coupling.spec.ts`, which
 * fails loudly on a name this map has that the generated client does not, or the reverse.
 *
 * @param operationId The operation's declared id.
 * @param operation The operation, for its request body's content types.
 * @returns Every generated function name for this operation.
 */
const functionNames = (operationId: string, operation: OpenApiOperation): string[] => {
    const contentTypes = Object.keys(operation.requestBody?.content ?? {});
    return contentTypes.length > 1 ? [operationId, `${operationId}WithMultipart`] : [operationId];
};

/**
 * The bundled contract, parsed. `parse` is the `yaml` package's YAML 1.2 loader; the `as` narrows
 * its `any` to the slice this file reads. https://eemeli.org/yaml/#yaml-parse
 */
const document = parse(readFileSync(INPUT, 'utf8')) as OpenApiDocument;

/** One `[generated function name, owning module]` pair per operation that has a module. */
const entries: [string, string][] = [];
// Walk every operation of every path.
for (const pathItem of Object.values(document.paths ?? {}))
    for (const method of OPERATION_METHODS) {
        const operation = pathItem[method];
        if (!isOperation(operation)) continue;

        const { operationId, 'x-module': moduleName } = operation;
        if (!operationId || !moduleName) continue; // a system path — owned by no module

        for (const name of functionNames(operationId, operation)) entries.push([name, moduleName]);
    }

entries.sort(([a], [b]) => a.localeCompare(b));

/** One generated property line per entry. */
const rows = entries
    .map(([name, moduleName]) => `    ${JSON.stringify(name)}: ${JSON.stringify(moduleName)},`)
    .join('\n');

/** The whole generated file's text. */
const output =
    '// Code generated by `npm run gen:api`. DO NOT EDIT.\n' +
    '/*\n' +
    ' * GENERATED — do not edit manually.\n' +
    ' * Source: openapi.yaml  |  Regenerate: npm run gen:api\n' +
    ' */\n\n' +
    '/** Every generated `@api` function, mapped to the backend module that owns its operation. */\n' +
    `export const OPERATION_MODULES: Record<string, string> = {\n${rows}\n};\n`;

// Write the file, or under `--check` compare it with what is on disk.
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
