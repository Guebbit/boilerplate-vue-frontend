---
source: src/i18n/country-label.ts
sha256: a6bb1ef068bca8a4e9576a9cb6e8bdf546bf09e83e790a30193e06f21fd0ac86
generated_at: 2026-10-02T11:52:50.241993+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/country-label.ts

## Purpose

Provides a single utility that turns an ISO 3166-1 alpha-2 country code into a human-readable name localized to the viewer's current language. It exists so the country `<select>` in `AddressFormDialog.vue` can display names in the viewer's language without pulling in a dedicated i18n dependency.

## Key elements

- **`countryLabel(code: string, viewingLocale: string): string`** – The sole export. Resolves `code` (e.g. `"IT"`) to a localized region name via `Intl.DisplayNames` scoped to `viewingLocale`. Returns the bare code unchanged if resolution is impossible (malformed BCP-47 tag, unsupported engine, or missing data).

## Relationships

- Consumed by `AddressFormDialog.vue` to populate the country picker options (E12).
- Mirrors the pattern in `language-label.ts` (`languageLabel`) for language select options.
- No import/export graph neighbors in this repository.

## Notes

- The `try`/`catch` is deliberate: `Intl.DisplayNames` has no non-throwing "can I resolve this?" API, so a malformed locale tag or a missing ICU data bundle will throw. The `eslint-disable` comment documents this; do not remove it.
- `i18n-iso-countries` was explicitly rejected (see `DECISIONS_0925_2_SHOP_SCOPE.md`, E12) for not meeting the 12-month maintenance window—do not reintroduce it.
- The function is pure and synchronous; it relies entirely on the runtime's built-in `Intl` data. If a target engine lacks full ICU data, the caller will silently receive the raw ISO code as the label.
