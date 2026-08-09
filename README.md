# KONBINI Shopify theme

Custom Shopify theme for KONBINI (konbini.pl), based on Shopify's
[Horizon](https://github.com/Shopify/horizon) reference theme.

Base snapshot: Horizon `main` @ `e038e9b` (2026-07-16).

## Requirements

- Node 20+ (installed via Homebrew: `brew install node`)
- Shopify CLI 3.x (`brew install shopify-cli`)

## Local development

Start a local preview against the store. The CLI opens a hot-reloading
preview and a theme editor link:

```bash
shopify theme dev --store <store>.myshopify.com
```

Check the theme for Liquid and schema errors:

```bash
shopify theme check
```

Push the local theme to an unpublished theme on the store:

```bash
shopify theme push --unpublished --theme "KONBINI dev"
```

Pull settings changed in the theme editor back into the repo:

```bash
shopify theme pull --only config/settings_data.json --only templates
```

## Structure

| Folder | Holds |
|---|---|
| `assets/` | CSS, JS, SVG, images the theme serves |
| `blocks/` | Theme blocks — the reusable units merchants drop into sections |
| `config/` | `settings_schema.json` (theme settings) and `settings_data.json` (their values) |
| `layout/` | `theme.liquid` and `password.liquid` page shells |
| `locales/` | Translations, including `pl.json` and `pl.schema.json` |
| `sections/` | Sections merchants add to templates |
| `snippets/` | Small Liquid partials rendered with `{% render %}` |
| `templates/` | JSON templates that compose sections per page type |

## Working rules

- Theme editor is not the source of truth. Changes made there must be pulled
  back into this repo, or they get overwritten on the next push.
- `config/settings_data.json` carries live merchant settings. Treat edits to
  it carefully and review the diff before committing.
- Horizon upstream keeps moving. To take upstream fixes, diff against the
  Horizon repo at the snapshot above rather than copying files wholesale.

## License

Horizon source is used under Shopify's license — see
[HORIZON-LICENSE.md](HORIZON-LICENSE.md).
