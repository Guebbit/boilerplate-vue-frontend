---
source: tests/unit/docker/runtime-config-entrypoint.spec.ts
sha256: d1ad0b4948b7ee57cfc73e84409a758b57171544398a2930646d129301769e03
signature: 2c103b1e15c98a64060e7cfd27d78a3614ab1394a64b750e927581acbf84db59
generated_at: 2026-11-10T07:52:40.772757+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/docker/runtime-config-entrypoint.spec.ts

## Purpose

Validates the two halves of the runtime-config contract: that `index.html` anchors its `config.js` `<script>` to the app base (so cold deep links boot correctly), and that the Docker entrypoint script `40-generate-runtime-config.sh` emits a well-formed `config.js` from `VITE_*` environment variables under the correct root.

## Key elements

- **`generate(environment)`** — Test helper that `spawnSync`s the shell script with a given env map against a scratch `NGINX_HTML_ROOT`, asserts exit 0, and returns the generated `config.js` string.
- **`describe('index.html runtime config script')`** — Two assertions on the Vite-built HTML template: the script tag uses `%BASE_URL%config.js`, and no document-relative `./config.js` path exists (which a deep link would misresolve).
- **`describe('40-generate-runtime-config.sh')`** — Three behavioral tests on the shell script: (1) only set keys appear in the output, (2) blank values are omitted entirely, (3) quote characters are escaped and newlines stripped to prevent string breakout.
- **`beforeEach` / `afterEach`** — Create a unique `mkdtempSync` directory under `os.tmpdir()` per case and remove it after, isolating each test's file output.

## Relationships

- **`tests/unit/scripts/pairing/spec-identity.spec.ts`** — No direct import or runtime interaction is visible in this file; the two specs cover unrelated subsystems (runtime-config entrypoint vs. pairing identity).

## Notes

- The HTML assertions are static-string checks against the committed `index.html` source (not a built artifact), so they verify the Vite template, not a production bundle.
- The shell-script tests shell out via `spawnSync('sh', …)` rather than mocking, making them integration-level within the "unit" directory. CI must have `sh` available.
- The `generate` helper intentionally passes only `PATH` and `NGINX_HTML_ROOT` plus the test's variables—any extra env var would need to be added explicitly to the test's `environment` map.
