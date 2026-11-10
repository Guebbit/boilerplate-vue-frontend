---
source: src/i18n/country-label.ts
sha256: 3a79768f6344d5786ec7c1c97c49be8f3535e6eac4d49173a819409cf84446fd
signature: 46171a426005e2a15b5ac572f0785589eb3bd394e86abb5ba91dea93996a35fd
generated_at: 2026-11-10T03:00:14.397613+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/country-label.ts

## Purpose

Provides a single utility to obtain a country's own localized display name (e.g. "Italy" vs. "Italia") using the browser's built-in `Intl.DisplayNames`. It replaces a library dependency that was rejected for not meeting the repo's 12-month maintenance-window policy. Used to label country picker options and, via `formatCountry`, to render localized names in printed addresses.

## Key elements

- **`countryLabel(code, viewingLocale): string`** — The sole export. Accepts an ISO 3166-1 alpha-2 code and the locale the label should be rendered in. Returns the localized country name, or the bare code as a fallback when `Intl.DisplayNames` cannot resolve it (malformed BCP-47 tag, missing CLDR data, or an unsupported engine).

## Relationships

No graph neighbors are recorded for this file. It is a leaf utility; other modules import it but no further dependencies or dependents are tracked in the graph.

## Notes

- `Intl.DisplayNames` can **throw** for a malformed tag or an engine without CLDR data; there is no non-throwing pre-check, so the `try/catch` is mandatory (noted in the inline `eslint-disable` comment). This mirrors the same pattern in `language-label.ts`'s `languageLabel`.
- The fallback is the **raw code string** (e.g. `"IT"`), not an English default. Callers that display addresses should be prepared for a two-letter string to appear in the UI if the engine lacks data.
- The function is synchronous and pure—no caching layer is added here. If performance becomes a concern at scale, that would be a caller-side responsibility.
