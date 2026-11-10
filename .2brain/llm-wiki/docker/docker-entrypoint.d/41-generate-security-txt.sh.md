---
source: docker/docker-entrypoint.d/41-generate-security-txt.sh
sha256: cd7c9b2a04f15ce1569d5778974edfac993c794b956c52de4d1d34e5300bfed5
signature: cd7c9b2a04f15ce1569d5778974edfac993c794b956c52de4d1d34e5300bfed5
generated_at: 2026-11-10T02:15:37.553263+00:00
model: ollama:qwen3.8:27b
---

# docker/docker-entrypoint.d/41-generate-security-txt.sh

## Purpose

Docker entrypoint hook that (re)generates `/.well-known/security.txt` (RFC 9116) from container environment variables at every startup. It is opt-in: if the required variables are absent, nothing is written and nginx returns 404, so a fork cannot accidentally publish an upstream's contact information.

## Key elements

- **`clean()`** – strips all control characters (`\000`–`\037`) from a string via `tr`, preventing a newline or other control byte in an env var from injecting an extra header line.
- **`VITE_SECURITY_CONTACT` / `VITE_SECURITY_EXPIRES`** – the two RFC-mandatory fields. Both must be non-empty (after cleaning) or the script exits 0 without writing.
- **`VITE_SECURITY_POLICY_URL`** – optional; emitted as `Policy:` line only when set.
- **`NGINX_HTML_ROOT`** – overrides the default `/usr/share/nginx/html` base directory.
- **Stale-file removal** – `rm -f "$TARGET_FILE"` runs unconditionally before the conditional write, so unsetting the variables on a restart removes a previously generated file.
- **`Preferred-Languages: en`** – hard-coded, always emitted when the file is written.

## Relationships

No graph neighbors are recorded. The script is a leaf in the entrypoint sequence (ordered by the `41-` prefix) and does not import or source any other file at runtime.

## Notes

- **Silent no-op is success.** When the required variables are missing the script logs a message and `exit 0`s. A missing `security.txt` is not a startup failure.
- **Control-character stripping is a security measure**, not just sanitisation: an env var containing `\n` could otherwise add arbitrary `Key: Value` lines to the file.
- **`Expires` is passed through verbatim.** The operator is responsible for supplying a valid ISO 8601 date-time; the script does not validate the format.
- **`set -eu`** is active, but the conditional `exit 0` path is explicit, so the missing-variable case is not treated as an error by the shell.
