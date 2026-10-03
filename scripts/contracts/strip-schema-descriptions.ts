#!/usr/bin/env tsx
/*
 * Strips every generated `.describe(...)` call out of the Zod schemas.
 *
 * orval has no config flag to suppress OpenAPI `description` text from the Zod output; the only
 * hook (`override.zod.params`) APPENDS a validator per call, it cannot filter one already emitted
 * (see `@orval/zod`'s `ZodParamsContext`). So `.describe()` comes out for every documented field
 * and enum value — around 1,700 of them — and rides into the runtime bundle as string literals
 * nothing at runtime reads: the schemas are only ever `.safeParse()`d
 * (`infrastructure/http/validate.ts`), never introspected for `.description`.
 *
 * Runs as the last step of `gen:api`, right after orval, so both `contracts/rest/schemas.zod.ts`
 * as committed and the `api-freshness` CI job (which re-runs `gen:api`) see it already stripped.
 *
 * AST-based, via the `typescript` package this repo already depends on — no new dependency for
 * one transform. A regex risks matching a `.describe(` that turns up INSIDE one of the
 * description strings themselves; `X.describe(args)` is always the outermost call of its chain,
 * so removing it is just "replace the CallExpression with its own `.expression`", printed back
 * with `ts.createPrinter`. `regenerate`'s `prettier --write contracts/rest` re-formats the result
 * the same way it already reformats orval's own output.
 *
 * Usage: tsx scripts/contracts/strip-schema-descriptions.ts --target <path> [--check]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/** The repo root. `import.meta.url` rather than `__dirname`: this script runs as ESM. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/*
 * Reads the required `--target` argument: the generated file to strip in place.
 *
 * @returns Absolute path of the file to transform.
 */
const resolveTargetPath = (): string => {
    const flagIndex = process.argv.indexOf('--target');
    const value = flagIndex === -1 ? undefined : process.argv[flagIndex + 1];
    if (!value) {
        console.error('Missing required argument: --target <path>');
        process.exit(1);
    }
    return path.resolve(ROOT, value);
};

/** The generated Zod file to strip, from `--target`. */
const TARGET = resolveTargetPath();

/** `--check` compares and reports; without it the file is rewritten in place. */
const checkOnly = process.argv.includes('--check');

// Refuse to run before orval has produced the file.
if (!existsSync(TARGET)) {
    console.error(`${TARGET} does not exist — run 'npm run gen:api' first.`);
    process.exit(1);
}

/*
 * A transformer factory: strips a `.describe(...)` call from the end of a member-access chain,
 * keeping the rest of the chain (`.regex(...)`, `.min(...)`, etc.) intact.
 *
 * `ts.visitEachChild` recurses into `visited.expression` BEFORE this node is checked, so a
 * `.describe()` nested deeper in the same chain (an array's item schema, say) is already gone by
 * the time an outer one is considered — one pass strips every depth.
 */
const stripDescribeVisitor = (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node) => {
        const visited = ts.visitEachChild(node, visit, context);
        if (
            ts.isCallExpression(visited) &&
            ts.isPropertyAccessExpression(visited.expression) &&
            visited.expression.name.text === 'describe'
        ) {
            return visited.expression.expression;
        }
        return visited;
    };
    // The root is always a `SourceFile` here, which `visit` never removes — `ts.visitNode` types
    // its result as possibly `undefined` only because a visitor is allowed to drop the node in
    // general, so this narrows back to a plain transformer.
    return (root: ts.Node): ts.Node => ts.visitNode(root, visit) ?? root;
};

/** The generated file's current text. */
const source = readFileSync(TARGET, 'utf8');

/**
 * TypeScript compiler API: parse the text into a syntax tree. `true` sets parent pointers on
 * the nodes; `ScriptKind.TS` parses it as plain TypeScript.
 * https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
const sourceFile = ts.createSourceFile(
    TARGET,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS
);
// `ts.transform(sourceFile, [transformerFactory])`: runs the strip visitor over the whole tree.
const result = ts.transform(sourceFile, [stripDescribeVisitor]);
// `removeComments: false` (the default) keeps every JSDoc block on the statements this pass
// leaves untouched — only the `.describe()` calls themselves, and the strings they carried, go.
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

/** The stripped file's text. */
const output = printer.printFile(result.transformed[0] as ts.SourceFile);
result.dispose();

// Under `--check` report whether stripping would change anything; otherwise rewrite in place.
if (checkOnly) {
    if (source === output) {
        console.log(`✓ ${TARGET} has no generated .describe() calls left to strip`);
    } else {
        console.error(
            `${TARGET} still carries generated .describe() calls.\n` +
                `  Run: npm run gen:api\n` +
                `  Then commit the result.`
        );
        process.exit(1);
    }
} else {
    writeFileSync(TARGET, output, 'utf8');
    console.log(`✓ Stripped .describe() calls from ${TARGET}`);
}
