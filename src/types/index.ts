/**
 * @module
 * Barrel aggregating this app's types — the generated REST client's, the generated AsyncAPI
 * types, and `realtime` — behind one import path, `@/types`.
 */

// The Orval-generated REST types, re-exported so consumers import from `@/types` rather than
// reaching into the generated package directly. Type-only on purpose: `@api` also exports the
// runtime client and a handful of runtime enum constants, and a `.vue` file importing either
// through this barrel would dodge the `@api` import ban `eslint.config.ts` enforces on components.
// The one runtime enum a template legitimately needs lives in `./enums.ts` instead.
export type * from '@api';

// Re-export generated AsyncAPI types so consumers use a single import path. The file is named
// after the spec it comes from — `npm run gen:asyncapi` writes it from `asyncapi.yaml` — and the
// paired backend names its own the same way, from the full contract this repo's copy is a subset
// of. Same generator, different input: the queue channels stay over there.
export * from './asyncapi.generated';

export * from './realtime';
