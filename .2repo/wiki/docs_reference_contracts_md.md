# docs/reference/contracts.md

## Purpose

Documents the contract layer of this frontend repo: the two spec files (`openapi.yaml`, `asyncapi.yaml`) that are **copied from a paired backend**, the client code generated from them under `contracts/` and `src/types/`, and the `spec-identity` check that keeps the two checkouts in lockstep. This file exists so a reader never edits a generated or copied artifact without understanding the regeneration pipeline and the identity guard.

## Key elements

- **`openapi.yaml`** — REST contract, byte-identical with the backend's copy. Source for every generated client function, Zod schema, and mock example.
- **`asyncapi.yaml`** — Realtime contract, *public half only* (channels a browser may observe). Intentionally shorter than the backend's full spec.
- **`spectral.yaml`** — Shared lint ruleset for `openapi.yaml`; kept identical to the backend's on purpose.
- **`contracts/rest/index.ts`** — Orval-generated typed API client (one function per operation, routed through the shared axios instance).
- **`contracts/rest/schemas.zod.ts`** — Orval-generated Zod schemas consumed by `response-schema-map.ts` for runtime validation.
- **`orval.config.ts`** — Orval generation config; resolves the JSON-vs-multipart duality for the seven operations that accept an optional image.
- **`scripts/spec-identity.ts`** — Defines the file list that must match the backend; `npm run check:spec-identity` enforces it.
- **`BACKEND_PATH` (env)** — Selects which paired backend (`boilerplate-node-backend` or `boilerplate-php-laravel-backend`) the identity check compares against. Defaults to the Node backend.

## Relationships

- **docs/reference/index.md** — This page is one of the entries listed in the reference index; the index is the table of contents for all `docs/reference/*` pages.
- **docs/reference/ops.md** — Operational runbooks (deploy, CI) reference the `check:spec-identity` and `sync:frontend` scripts documented here; ops assumes the contract layer is already in sync.
- **docs/modules/users.md** — The Users module's API surface (list, create, update, delete) is defined in `openapi.yaml`; its generated client functions and Zod schemas live in `contracts/rest/` and are consumed by module code.
- **README.md** — The project README points readers to this page for "where the API contract lives" and for the regeneration commands.

## Notes

- **Nothing under `contracts/`, the two `.yaml` specs, or `src/types/asyncapi.generated.ts` is hand-edited.** Orval rewrites `contracts/rest/` wholesale; the specs arrive from the backend. Any local edit is overwritten on the next `gen:api` or `sync:frontend`.
- **`spec-identity` compares parsed, normalised YAML, not raw bytes.** This is deliberate: the PHP Laravel backend's bundler is not byte-stable run-to-run, so a pure reformat would otherwise flag a false fork. A real content change still fails the check.
- **`BACKEND_PATH` is read fresh on every `check:spec-identity` run.** Syncing from one backend while `BACKEND_PATH` still points at the other will report a fork even though the files were just copied. Flip the variable before syncing if you switch backends.
- The two backend variants (Node vs PHP-Laravel) are functionally identical (same routes, same event/action names) but differ in bundler output; the normalised comparison handles that.
