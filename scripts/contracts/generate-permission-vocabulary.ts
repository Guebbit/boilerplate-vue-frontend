#!/usr/bin/env tsx
/*
 * Generates the permission vocabulary from `authorization-keys.yaml`: actions, subjects, rule ids,
 * set names, scopes, step-up tiers and the subject-to-actions pair map, each a runtime array plus
 * its union type.
 *
 * The render module beside it is the same text in both repos (kept by hand, not synced); both write a
 * `permission-vocabulary` module beside their other generated contract types. The input is the SAME
 * document in both: the backend reads its `shared/authorization-keys.generated.yaml`, the frontend the copy
 * `sync:frontend` hands it (`contracts/authorization-keys.yaml`).
 *
 * Usage: tsx scripts/contracts/generate-permission-vocabulary.ts --in <yaml> --out <path>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    readPermissionVocabulary,
    renderPermissionVocabulary
} from './permission-vocabulary-render';

/** The repo root. `import.meta.url` rather than `__dirname`: this script runs as ESM. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/*
 * Reads a required `--flag <value>` argument.
 *
 * @param flag The flag name, with its dashes.
 * @returns Absolute path the value names.
 */
const requiredPath = (flag: string): string => {
    const value = process.argv[process.argv.indexOf(flag) + 1];
    if (process.argv.includes(flag) && value) return path.resolve(ROOT, value);
    console.error(`Missing required argument: ${flag} <path>`);
    process.exit(1);
};

/** The permission-key YAML to read, from `--in`. */
const INPUT = requiredPath('--in');

/** The file to generate, from `--out`. */
const OUTPUT = requiredPath('--out');

/** The whole generated file's text. */
const output = renderPermissionVocabulary(readPermissionVocabulary(readFileSync(INPUT, 'utf8')));

writeFileSync(OUTPUT, output, 'utf8');
console.log(`✓ Generated ${OUTPUT}`);
