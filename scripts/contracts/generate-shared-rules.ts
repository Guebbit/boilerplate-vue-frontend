#!/usr/bin/env tsx
/**
 * @module
 * Everything `regenerate` derives from the frontend-owned rules files, in one step:
 *
 * - `shared/rules/schemas/<name>.schema.json`: each file's Zod schema as JSON Schema, so another
 *   frontend validates the same YAML without Zod.
 * - `<out>.generated.ts`: the data as a committed `as const` file the code imports.
 *
 * `--check` writes nothing and exits 1 on a stale file. The backend runs the same renderer over
 * its own `shared/rules/`; the two never read each other's files except the synced ones.
 *
 * See: docs/tools/shared-rules.md
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { parse } from 'yaml';
import { z } from 'zod';
import { writeOrCheck } from './generated-file';
import { failScript } from '../fail-script';
import { renderGenerated } from './shared-rules/render';
import { SHARED_RULES } from './shared-rules/rules';
import type { LoadRules, SharedRule } from './shared-rules/rules';

/** The repo root. `import.meta.url` rather than `__dirname`: this script runs as ESM. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The command that fixes a stale file, named in the `--check` failure. */
const FIX_COMMAND = 'npm run gen:shared-rules';

/**
 * Reads and validates one YAML file.
 *
 * @param relative - repo-relative path
 * @param schema - what it must look like
 * @returns the parsed data
 */
const readRules: LoadRules = (relative, schema) =>
    // `yaml`'s `parse` throws on a syntax error, naming the line. https://eemeli.org/yaml/#yaml-parse
    schema.parse(parse(readFileSync(path.join(ROOT, relative), 'utf8')));

/**
 * The document a rule's constants are cut from: its YAML, or what the rule derives from several.
 *
 * @param rule - its registry entry
 * @returns the validated data
 */
const documentOf = (rule: SharedRule): unknown =>
    rule.derive ? rule.derive(readRules) : readRules(rule.source, rule.schema);

/**
 * Formats like the Prettier CLI would, so `prettier:check` accepts the file untouched.
 *
 * @param file - absolute path; selects the parser and the config
 * @param content - the unformatted text
 * @returns the formatted text
 */
const formatted = (file: string, content: string): Promise<string> =>
    // Prettier: `resolveConfig` reads .prettierrc/.editorconfig; `filepath` picks the parser.
    // https://prettier.io/docs/api
    resolveConfig(file, { editorconfig: true }).then((config) =>
        format(content, { ...config, filepath: file })
    );

/**
 * Writes (or checks) one rule's JSON Schema and generated TypeScript.
 *
 * @param name - the rule's name
 * @param rule - its registry entry
 * @returns once both files are written or checked
 */
const writeRule = (name: string, rule: SharedRule): Promise<void> => {
    const schemaFile = path.join(ROOT, 'shared', 'rules', 'schemas', `${name}.schema.json`);
    // Zod 4's built-in exporter. https://zod.dev/json-schema
    const schemaText = `${JSON.stringify(z.toJSONSchema(rule.schema), undefined, 2)}\n`;
    const out = path.join(ROOT, rule.generate.out);
    const sources = rule.inputs.join(' + ');
    return Promise.all([
        formatted(schemaFile, schemaText),
        formatted(out, renderGenerated(sources, rule.generate, documentOf(rule)))
    ]).then(([schemaOut, text]) => {
        writeOrCheck(schemaFile, schemaOut, rule.source, FIX_COMMAND);
        writeOrCheck(out, text, sources, FIX_COMMAND);
    });
};

Promise.all(Object.entries(SHARED_RULES).map(([name, rule]) => writeRule(name, rule))).catch(
    failScript
);
