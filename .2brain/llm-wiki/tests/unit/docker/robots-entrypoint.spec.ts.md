---
source: tests/unit/docker/robots-entrypoint.spec.ts
sha256: e83132cea20ce9486898af2c362455d9918eb86e68815ef0cd66d214af8a5233
signature: a89a5a612dce5e42d352ec55ebce5e117174375055f82eef96416a57e053cacf
generated_at: 2026-11-10T07:52:30.768164+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/docker/robots-entrypoint.spec.ts

## Purpose

Vitest spec that verifies the runtime contract of `docker/docker-entrypoint.d/42-generate-robots.sh` and the `nginx.conf` it feeds. It locks in the default-off indexing policy (noindex + nofollow everywhere), the opt-in semantics of `VITE_ROBOTS_INDEX`, the sitemap line generation, and the invariant that `X-Robots-Tag` is emitted in every nginx block that already sets the security headers.

## Key elements

- **`run(environment)`** – Helper that `spawnSync`s the entrypoint script against scratch `NGINX_HTML_ROOT` / `NGINX_CONF_DIR` directories and asserts exit code 0.
- **`robotsTxt()` / `robotsMap()`** – Small readers for the two artifacts the script produces (`robots.txt`, `00-robots-tag.conf`).
- **`countOf(header)`** – Counts occurrences of an `add_header` directive string in the static `nginx.conf` text, used to compare security-header and robots-header block counts.
- **`describe('42-generate-robots.sh')`** – Table-driven tests covering: default off, falsy values (`false`, `0`, `no`, empty), truthy values (`true`, `1`, `yes`, `on`), trailing-slash normalisation on `VITE_API_URL`, missing `VITE_API_URL`, re-run to confirm withdrawal, and a newline-injection safety check.
- **`describe('nginx.conf and the robots header')`** – Asserts that `X-Robots-Tag` appears in the same number of blocks as the other security headers, and that `/robots.txt` is served as `text/plain` via `try_files` rather than the SPA fallback.
- **`beforeEach` / `afterEach`** – Create and remove per-test temp directories under `os.tmpdir()`.

## Relationships

No direct code-level interaction with `tests/unit/scripts/pairing/spec-identity.spec.ts` is present in this file; they are co-located unit specs under `tests/unit/` but share no imports or fixtures.

## Notes

- The script under test is located at `docker/docker-entrypoint.d/42-generate-robots.sh`, resolved relative to `__dirname` three levels up.
- The nginx config is read as a **static string** at module load; the header-count test is a text-level assertion, not a live nginx render.
- The newline-injection test guards against `VITE_API_URL` containing `\n` to forge additional `robots.txt` directives.
- The "goes back to off" test runs the script a second time with no `VITE_ROBOTS_INDEX` to confirm the map is overwritten (not appended).
