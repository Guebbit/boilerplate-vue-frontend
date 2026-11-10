---
source: scripts/lighthouse/chrome.ts
sha256: ea34df29bdab0fdd7760879716f53d2925f71108033489b70254d2083b769501
signature: dc5015271573f82f5cb253158ca1c43226efed3cb7dbf0ebfdb7b9fe76c941cd
generated_at: 2026-11-10T02:42:20.163920+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/chrome.ts

## Purpose

Launches a headless Chrome instance with all network egress locked down (no external DNS resolution, no proxy escape) and attaches a Puppeteer connection, so that a subsequent Lighthouse audit runs in a fully isolated, loopback-only environment.

## Key elements

- **`LOOPBACK_HOSTS`** — const tuple of the three hostnames considered local (`localhost`, `127.0.0.1`, `[::1]`). Used by callers to verify a URL targets the local machine.
- **`chromeFlags({ root })`** — Returns the array of Chrome CLI flags for an audit. Applies `--host-resolver-rules` (every hostname except loopback fails DNS) and `--proxy-server=127.0.0.1:9` (a closed port that catches any IP-literal traffic Chrome wouldn't route through the resolver). Conditionally adds `--no-sandbox` and `--disable-dev-shm-usage` when running as root.
- **`AuditBrowser`** (interface) — Describes the result of a launch: the DevTools `port`, the attached Puppeteer `Browser`, and a `close()` that disconnects Puppeteer then kills the Chrome process.
- **`launchAuditBrowser()`** — Calls `chrome-launcher`'s `launch()` with the flags above, then connects Puppeteer (`puppeteer.connect`) to the already-running Chrome over `127.0.0.1:<port>`. Returns a `Promise<AuditBrowser>`.

## Relationships

- **`scripts/lighthouse/evaluate.ts`** — Consumes the `AuditBrowser` (or the `port`) to run the Lighthouse audit and, per the module doc-comment, validates the `network-requests` audit to confirm no egress leaked.
- **`scripts/lighthouse/collect.ts`** — Calls `launchAuditBrowser()` to obtain the isolated browser before running `evaluate.ts`, and calls `close()` when the audit is complete.
- **`scripts/lighthouse/run.ts`** — Top-level orchestration that wires `collect.ts` → `evaluate.ts` and ultimately tears down the browser.
- **`tests/unit/scripts/lighthouse/chrome.spec.ts`** — Unit-tests `chromeFlags` output (flag ordering, root vs. non-root) and the shape/contract of `launchAuditBrowser`.

## Notes

- Puppeteer is imported as `puppeteer-core` and used in **connect** mode, not launch mode—Chrome is already running via `chrome-launcher`. Calling `puppeteer.launch()` here would start a second, unflagged browser.
- `defaultViewport: null` is passed to `puppeteer.connect` so that Lighthouse's own viewport emulation is not overridden.
- The proxy target is port **9** (discard), which is closed on virtually every system; this is the backstop for IP-literal requests that bypass the host-resolver rules.
- `process.getuid?.()` is used with optional chaining so the code does not crash on platforms without `getuid` (e.g., Windows), where the root branch is simply never taken.
