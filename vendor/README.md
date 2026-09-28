# Vendored `@cyber-eco/*` packages

These tarballs are `npm pack` outputs of the CyberEco data layer, committed so
`npm ci` works without a GitHub Packages token (the packages are private on
`npm.pkg.github.com`; plan B1/B2a, ADR 0011).

| Package | Version | Built from |
|---|---|---|
| `@cyber-eco/types` | 0.2.1 | `cyber-eco/cybereco-hub@08a521f4a994146e69325153d018823ec9147de8` |
| `@cyber-eco/auth` | 0.2.1 | same commit |
| `@cyber-eco/supabase` | 0.2.1 | same commit |

`package.json` points at them with `file:` specifiers and pins the transitive
`@cyber-eco/types` with an `overrides` entry, so `auth` and `supabase` share
one copy of the interfaces.

## Rebuilding

```sh
cd cybereco-hub
npx turbo run build --filter=@cyber-eco/types --filter=@cyber-eco/auth --filter=@cyber-eco/supabase
for p in types auth supabase; do (cd packages/$p && npm pack --pack-destination ../../../JustSplit/vendor); done
cd ../JustSplit && npx npm@latest install   # regenerate the lockfile (see SETUP.md)
```

## Switching back to the registry

Once `GH_PACKAGES_TOKEN` exists (SETUP.md §4) and the hub publishes relational
mode (plan H2), replace the three `file:` specifiers with the published
versions, drop the `overrides` entry, delete this directory and regenerate the
lockfile. CI already exports `NODE_AUTH_TOKEN` for the scoped registry.
