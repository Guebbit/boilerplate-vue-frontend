/**
 * @module
 * Barrel aggregating this app's generated types — the REST client's and the AsyncAPI feed's —
 * behind one import path, `@/types`. View-only types a single module owns (`realtime`,
 * `webhooks`) live in that module's own `types.ts` instead; nothing here is module-owned.
 */

// The Orval-generated REST types, re-exported so consumers import from `@/types` rather than
// reaching into the generated package directly. Type-only on purpose: `@api` also exports the
// runtime client and a handful of runtime enum constants, and a `.vue` file importing either
// through this barrel would dodge the `@api` import ban `eslint.config.ts` enforces on components.
// The one runtime enum a template legitimately needs lives in `./enums.ts` instead.
export type * from '@api';

// Re-export generated AsyncAPI types so consumers use a single import path. The generated file
// itself lives next to the REST client's output, `contracts/asyncapi.generated.ts` — both are
// codegen output this repo commits, not source this module owns — and `npm run gen:asyncapi`
// writes it from `asyncapi.yaml`. Same generator as the paired backend, different input: the
// queue channels stay over there.
export * from '../../contracts/asyncapi.generated';
