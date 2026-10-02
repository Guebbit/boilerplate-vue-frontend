---
source: docker/docker-entrypoint.d/41-generate-security-txt.sh
sha256: 6ed70bd6d36eae71e0f7af51311135e18b0938c8445e8fbf131669c63cd205ed
generated_at: 2026-10-02T11:22:41.992411+00:00
model: ollama:qwen3.8:27b
---

# docker/docker-entrypoint.d/41-generate-security-txt.sh

## Purpose

Container-startup hook that writes `/.well-known/security.txt` (RFC 9116) into the nginx HTML root, sourced entirely from runtime environment variables. It is off by default: without both required variables set, no file is created and nginx's existing `location` block returns 404. Placing the logic at runtime (like `config.js`) ensures a fork never ships a stale or foreign contact address baked into the image.

## Key elements

- **`clean()`** — Strips all control characters (`\000`–`\037`) from a string via `tr`, preventing a newline in an env var from injecting a spurious `key: value` header line into the output file.
- **`SECURITY_TXT_ROOT` / `HTML_ROOT`** — Overridable root directory (default `/usr/share/nginx/html`) under which `.well-known/security.txt` is written.
- **`VITE_SECURITY_CONTACT`** (required) — Value for the `Contact:` header line.
- **`VITE_SECURITY_EXPIRES`** (required) — Value for the `Expires:` header line; passed through verbatim (operator supplies ISO 8601).
- **`VITE_SECURITY_POLICY_URL`** (optional) — If non-empty, emitted as a `Policy:` line.
- **Stale-file guard** — `rm -f "$TARGET_FILE"` runs unconditionally before the publish check, so a file from a previous run with different env vars is always removed.
- **`Preferred-Languages: en`** — Always appended as the final line when the file is written.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- Numbered `41` to control its position in the `docker-entrypoint.d` execution sequence; it must run after any script that prepares the nginx HTML directory.
- The script uses POSIX `sh` (not `bash`) and `set -eu`, so any unbound variable or failed command aborts the entrypoint.
- `exit 0` (not `exit 1`) is used when the variables are absent, so a missing `security.txt` is treated as a valid, non-fatal state.
- The `clean()` guard matters because `printf '%s'` does not interpret escape sequences, but a literal `\n` in the variable would still split the line.
- The file is rewritten from scratch on every container start; there is no merge or append logic.
