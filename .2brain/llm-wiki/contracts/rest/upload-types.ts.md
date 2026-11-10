---
source: contracts/rest/upload-types.ts
sha256: a306e92bd0f0f0b8547641885740b78a4fe922d4375a03f8579e0376257e1f13
signature: 358f481fcd3f1d2196ddc19d31ac2886e41e2d36b044246931745cfac7e36a52
generated_at: 2026-11-10T02:13:12.740155+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/upload-types.ts

## Purpose

Auto-generated contract types that define the set of image media types accepted by the `imageUpload` API endpoint. It exists so client and server code share a single, spec-derived source of truth for upload validation without duplicating MIME-type strings.

## Key elements

- **`ACCEPTED_UPLOAD_TYPES`** — An `as const` array listing the three accepted MIME types: `image/png`, `image/jpeg`, `image/webp`.
- **`AcceptedUploadType`** — A union type (`'image/png' | 'image/jpeg' | 'image/webp'`) derived from the array via `typeof … [number]`. Use it to type parameters, props, or validators that must be constrained to one of the accepted types.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Generated file.** Both the header comment and the top-of-file directive state it is produced by `npm run gen:api` from `openapi.yaml`. Do not edit by hand; add or remove MIME types in the OpenAPI spec and regenerate.
- The `as const` assertion makes the array a literal tuple, which is what lets the derived union type resolve to the three exact string literals rather than `string[]`.
