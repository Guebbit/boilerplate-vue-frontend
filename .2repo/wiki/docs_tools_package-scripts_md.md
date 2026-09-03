# docs/tools/package-scripts.md

## Purpose

Groups every `package.json` script by job (development, container, build/validation, test, codegen, docs) instead of raw list order, so a reader can find the right invocation without scanning the full script array. Each entry links to the deeper page that explains the mechanism.

## Key elements

- **Development** – `dev` (Vite HMR on `:8080`, port from `VITE_APP_PORT` in `.env`) and `preview` (local prod-build preview).
- **Container** – `compose:restart`, `compose:rebuild`, `compose:kill`, and generic `compose`; all expand to `${CONTAINER_ENGINE:-podman} compose`.
- **Build & validation** – `build` (vue-tsc + Vite), `lint`/`lint:fix`, `lint:openapi`, `lint:asyncapi`, `prettier`/`prettier:fix`, `check:asyncapi-types`, `check:spec-identity`, and the composite gates `complete`, `complete:fix`, `complete:manual`.
- **Test** – `test:module`, `test:unit`, `test:unit:report`, `test:report`, `test:e2e`, `test:e2e:serial`, `test:e2e:dev`, `test:e2e:spec`, `test:e2e:live`, `test:mutation`, and the umbrella `test`.
- **Contract & codegen** – `regenerate` (gen:api → gen:asyncapi → prettier:fix), `gen:api` (orval from `openapi.yaml`), `gen:asyncapi` (from `asyncapi.yaml`), plus the lint/check pairs above.
- **Docs** – `docs:dev`, `docs:build`, `docs:preview` (VitePress).

## Relationships

- **`docs/tools/runtime.md`** – explains the `dev`/`preview`/`build` mechanics this page only names.
- **`docs/tools/docker-and-podman.md`** – full compose workflow; this page lists the script verbs and the `CONTAINER_ENGINE` override.
- **`docs/tools/testing-and-docs.md`** – details for `lint`, `prettier`, `check:spec-identity`, `complete*`, all `test:*` scripts, and the `docs:*` scripts.
- **`docs/api/openapi-workflow.md`** – orval codegen pipeline and Spectral linting that `regenerate` / `gen:api` / `lint:openapi` invoke.
- **`docs/api/asyncapi-workflow.md`** – AsyncAPI codegen and validation behind `gen:asyncapi`, `check:asyncapi-types`, `lint:asyncapi`.
- **`docs/tools/live-e2e.md`** – manual live-backend e2e flow triggered by `test:e2e:live`.
- **`docs/tools/package-dependencies.md`** – listed as a related page for cross-referencing tool versions.

## Notes

- `CONTAINER_ENGINE` must be a **shell** env var (`export CONTAINER_ENGINE=docker`), not a `.env` entry — npm never reads `.env`, so a value placed there is invisible to the script.
- Generated output (`contracts/rest/`, `src/types/asyncapi.generated.ts`) is **committed**. CI re-runs generation and fails on diff. Because orval emits 2-space indentation while the repo commits 4, every codegen step must be followed by `prettier:fix`; `regenerate` bundles it, making it the preferred entry point over `gen:api` alone.
- `openapi.yaml`, `asyncapi.yaml`, and `db/demo/demo-data.json` are **owned by the backend repo** and arrive via the backend's `npm run sync:frontend`. The cross-repo sequence is: backend `regenerate` → commit → pull here → `npm run regenerate` here. `check:spec-identity` fails (fatal in CI) if the pair drifts.
- `test:mutation` (Stryker) is deliberately excluded from PR gates; run it nightly or before a large refactor.
- `test:e2e` shards across `E2E_SHARDS` processes; use `test:e2e:serial` when interleaved output is unreadable.
