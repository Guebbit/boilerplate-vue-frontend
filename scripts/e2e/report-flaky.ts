#!/usr/bin/env tsx
/**
 * Prints the tests of the last Cypress run that passed only on a retry — see `flaky-report.ts`.
 *
 * For the runs that do not go through `run-shards.ts` (the live profile, a single spec): a CI step
 * calls this after Cypress, whatever its outcome. Always exits 0: a retry-pass is a warning.
 */
import { printFlakyReport } from './flaky-report';

printFlakyReport();
