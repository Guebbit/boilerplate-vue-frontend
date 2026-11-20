#!/usr/bin/env tsx
/*
 * Generates the permission vocabulary from `authorization-keys.generated.yaml`: actions, subjects, rule ids,
 * set names, scopes, step-up tiers and the subject-to-actions pair map, each a runtime array plus
 * its union type.
 *
 * The render module beside it is the same text in both repos (kept by hand, not synced); both write a
 * `permission-vocabulary` module beside their other generated contract types. The input is the SAME
 * document in both: the backend reads its `shared/authorization-keys.generated.yaml`, the frontend the copy
 * `sync:frontend` hands it (`contracts/authorization-keys.generated.yaml`).
 *
 * Usage: tsx scripts/contracts/generate-permission-vocabulary.ts --in <yaml> --out <path>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requiredPath } from '../cli';
import {
    readPermissionVocabulary,
    renderPermissionVocabulary
} from './permission-vocabulary-render';

/** The repo root. `import.meta.url` rather than `__dirname`: this script runs as ESM. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The permission-key YAML to read, from `--in`. */
const INPUT = requiredPath('in', ROOT);

/** The file to generate, from `--out`. */
const OUTPUT = requiredPath('out', ROOT);

/** The whole generated file's text. */
const output = renderPermissionVocabulary(readPermissionVocabulary(readFileSync(INPUT, 'utf8')));

writeFileSync(OUTPUT, output, 'utf8');
console.log(`✓ Generated ${OUTPUT}`);
