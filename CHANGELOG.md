# Changelog

All notable changes to this frontend are recorded here. Contract changes arrive from the paired
API (`npm run sync:frontend` over there) and are listed under the release that adopts them.

## Unreleased

### Breaking — translation `scope` becomes `tenant`

The API's `LocaleScope` enum (`app` | `api`) is gone. A **tenant** is one keyspace authored by one
team; this build is one (`demo-fe`) and the API is another (`demo-be`). See the API's
`CHANGELOG.md` for the contract.

- New `VITE_LOCALE_TENANT` names this build's tenant (default `demo-fe`). The runtime overrides
  (`GET /locales/{locale}/messages`) are fetched for that tenant.
- The locales admin reads the registry from `GET /locales/tenants`: the entries page, the
  dictionary board and both dialogs offer those ids instead of a hardcoded pair.
- The dictionary board shows bundled baselines only for this build's own tenant and deployed API
  baselines only for the backend tenant; any other tenant lists its stored rows alone, and says so.
- `LocaleCapability.scopes` → `tenants` wherever the manifest is read.

### Added

- `useDialogStore` + `AppDialogHost`: one app-wide confirmation dialog, promise-based, replacing
  every `globalThis.confirm`.
- Dictionary board (`/locales/dictionary`): every key × every language, with missing counts.
- List pages search through `POST /{resource}/search`.
