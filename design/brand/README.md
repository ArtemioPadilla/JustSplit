# Brand sources

Editable sources of the JustSplit logo. They are **not published**: only
`public/` reaches the site.

- `logo.ai`, `logo-square.ai`, `logo-ico.ai`, `logo-white.ai`, `logo.xcf`,
  `favicon.xcf`: the original artwork (pre-migration).
- `logo.png`: the logo shown in the repository README.

The app icons are not exported from these files. They are rendered from the
vector trace in `public/icons/logo-source.svg` and `logo-maskable.svg` by
`npm run icons` (`scripts/render-icons.mjs`, plan B20b). Edit the SVGs, then
re-run the script.
