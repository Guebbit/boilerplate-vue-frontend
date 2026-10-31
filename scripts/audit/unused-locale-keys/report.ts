#!/usr/bin/env tsx
/**
 * Prints every locale key nothing reads — `npm run audit:locale-keys`.
 * Always exits 0 and edits nothing: a report, not a gate.
 */
import { scanLocaleKeys } from './scan';

const { unused, files } = scanLocaleKeys();
for (const line of unused) console.info(line);
console.info(`\n${String(unused.length)} unused key(s) across ${String(files)} file(s).`);
