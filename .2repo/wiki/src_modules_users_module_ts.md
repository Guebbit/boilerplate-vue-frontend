# src/modules/users/module.ts

## Purpose

Module manifest for the **users** admin screens (list, detail, create, edit). It registers routes, a navigation entry, response schemas, and locale loaders with the app's `AppModule` registry so the kernel can mount everything in one place.

## Key elements

- **Default export** (`satisfies AppModule`) — a single object with:
  - `name: 'users'`
  - `routes` — re-exported from `./routes`
  - `navigation` — one entry (`UsersList`) in the `admin` section, order 50, `Users` icon from `lucide-vue-next`, label key `navigation.label-users-list`, `plural: 2`
  - `responseSchemas` — re-exported from `./response-schemas`
  - `locales` — lazy-loaders that `import()` `./locales/en.json` and `./locales/it.json` and return the default dictionary

## Relationships

- **`src/modules/users/routes.ts`** — imports the default `routes` array and attaches it to the manifest.
- **`src/modules/users/response-schemas.ts`** — imports the named export `usersResponseSchemas` and attaches it to the manifest.

Both are purely consumed here; this file adds no logic of its own beyond wiring.

## Notes

- The module explicitly has **no runtime dependencies** on the account/auth module. The comment clarifies the dependency direction: the *account* module reads shared field rules from *users*, never the reverse.
- `plural: 2` in the navigation entry is an i18n hint (the label is a plural noun), not a count.
- `satisfies AppModule` is used instead of a typed annotation, so the object keeps its literal types while still being checked against the registry contract.
