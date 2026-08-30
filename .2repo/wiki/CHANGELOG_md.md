# CHANGELOG.md

## Purpose

Records all notable changes to the frontend in Keep a Changelog format. Contract changes do not originate here—they arrive from the paired API via `npm run sync:frontend` and are listed under the release that adopts them. The file doubles as the authoritative log of breaking behavioural and tooling shifts so contributors (human or AI) can reason about what changed between versions.

## Key elements

- **`## [3.0.0] - 2026-08-23`** — The release that removed the mock layer and established the current module pattern (one folder under `src/modules/`, one `module.ts` manifest, typed `dependsOn` edges, `core`/`supporting`/`generic` classification). Documents every breaking behaviour and tooling change in that release.
- **`## Unreleased`** — In-flight changes not yet versioned. Currently contains:
  - *Fixed*: Wishlist link bug (title used as route param instead of id).
  - *Changed / BREAKING (contract)*: `ObservabilityHealth.nodeVersion` → `runtimeVersion`; `openapi.yaml` adopts missing `422` declarations; `listFeedbackRequests` lost its first positional argument and `searchFeedbackRequests` is new; `HardDeleteParamParameter` replaces three inline booleans.
  - *Added*: `POST /feedback/search` registered in both the module response-schemas map and the cross-cutting `response-schema-map.spec.ts` table; wishlist e2e relocated into the module folder.
- **Release link anchor** — `[3.0.0]` points to the GitHub release tag `v3.0.0`.

## Relationships

- **openapi.yaml** — The changelog explicitly states this file is *copied* from the paired API; every client type is generated from it. Unreleased entries describe specific contract deltas (new `422` responses, new `POST /feedback/search`, renamed health field).
- **asyncapi.yaml** — Referenced as the source of generated types for the admin-gated SSE playground added in 3.0.0.
- **package.json** — Multiple npm scripts are the operational surface described here: `npm run sync:frontend` (contract pull), `npm run dev` (boots real backend via demo profile), `npm run lint` (fails on warnings since 3.0.0), `test:e2e:live` (merge gate).
- **docker-compose.production.yml** — The "demo profile boots automatically" sentence in 3.0.0 implies the compose stack is how `npm run dev` and e2e scripts reach a live backend without MSW.
- **docs/api/observability.md** — The breaking rename `nodeVersion` → `runtimeVersion` and the new i18n key `admin-page.label-runtime-version` affect the admin overview card documented there.
- **docs/api/endpoints.md** — The feedback endpoint reshaping (`GET /feedback` body removed, `POST /feedback/search` added, `hardDelete` params extracted) changes the surface described in the endpoints doc.
- **docs/modules/wishlist.md** — The Unreleased fixed entry and the e2e-relocation note both concern the wishlist module's routing and test coverage.
- **docs/theory/layers.md** — The 3.0.0 "The pattern" paragraph (module manifest, barrel rule, classification) is the normative description that the layers doc elaborates.
- **CLAUDE.md** / **README.md** — Both are top-level orientation files; the changelog's "Breaking — tooling" section (kebab-case enforcement, `useAsyncAction` origin, byte-mirrored contract files) is the kind of convention those files reference or assume.

## Notes

- **Contract operations need two registrations.** Adding or removing a response schema requires a row in *both* the module's `response-schemas.ts` map *and* the hand-written `ROUTES` table in `tests/unit/infrastructure/http/response-schema-map.spec.ts`. Forgetting either leaves a silent wildcard or a missing validation.
- **Positional-argument removals are footguns.** The `listFeedbackRequests` change removed the *first* argument, so any surviving positional call now silently passes its body as `params`. The changelog flags this explicitly; AI assistants editing call sites must check argument order, not just the signature.
- **`VITE_VALIDATE_RESPONSES=false`** restores the pre-3.0.0 tolerance for malformed 2xx responses (renders empty list instead of rejecting). Useful for local debugging against a mismatched backend.
- **The changelog is not auto-generated.** Module docs are hand-written; the two "rules worth keeping" (barrel discipline, `generic` no-`domain/` rule) were promoted into cross-cutting architecture specs rather than enforced by a linter.
- **`main` forked from the 2.1.0 line before 3.0.0 was cut**, so every entry in 3.0.0 is new relative to 2.1.0—there is no incremental 2.2 / 2.3 history to check for intermediate changes.
