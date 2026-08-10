# New Feature Checklist

Use this when adding any new domain/module.

## Required shape

```text
src/features/<feature>/
├── index.ts        # public API only
├── routes.ts       # route records (if routable)
├── store.ts        # feature state + API orchestration
├── schemas.ts      # form/runtime validation
├── composables/    # feature-only UI logic
└── views/          # feature pages/components
```

## Boundary rules

- Feature internals are private by default.
- Cross-feature imports go through `@/features/<feature>` only.
- Views/pages never import from `@api` directly.
- Entities (`src/entities/`) stay framework/app independent.
- Multi-domain workflows belong in a dedicated feature (example: checkout).

## Contract + generated code rules

- API shape starts in `openapi.yaml`.
- Generated client/schemas come from `contracts/rest/*`.
- Do not hand-write endpoint wrappers unless strictly needed.

## Architecture quality gates

- `npm run lint` enforces import boundaries.
- `npm run lint:architecture` reports feature coupling and fails on deep feature imports.

## Done criteria

- Public entry (`index.ts`) exposes only supported surface.
- No deep feature imports were introduced.
- Documentation for the new feature/layer is updated.
