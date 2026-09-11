# Shopify theme

A from-scratch Shopify theme built on Tailwind CSS v4, driven entirely by
design tokens. Nothing in the sections/snippets hardcodes a color, spacing
value, font size or radius — they all read from a small set of tokens, so
changing the look of the whole store is a one-file (or one theme-editor
setting) change.

## Getting started

```sh
npm install
npm run dev
```

This runs `shopify theme dev` and the Tailwind CLI in watch mode together.
`assets/tailwind.output.css` is the compiled, committed stylesheet the theme
actually serves — Shopify has no build step of its own, so it must stay in
the repo and up to date. If you edit any CSS and don't see it reflected,
make sure `npm run dev` (or `npx @tailwindcss/cli -i ./assets/tailwind.input.css
-o ./assets/tailwind.output.css`) is running.

## How the design tokens work

Two layers work together:

1. **Runtime values** — plain CSS custom properties written to `:root` (and
   `.color-scheme-*` classes) by [`snippets/theme-variables.liquid`](snippets/theme-variables.liquid),
   sourced from `settings_schema.json`. This is what the merchant controls
   from the theme editor: colors, fonts, corner radius, page width/padding,
   section spacing.
2. **Tailwind tokens** — [`assets/tokens.css`](assets/tokens.css) turns those
   variables (plus fixed developer-level scales, like the fluid heading
   type scale) into real Tailwind utilities via `@theme` / `@theme inline`.
   Sections and snippets only ever use these utilities
   (`bg-button`, `text-h1`, `rounded-md`, `max-w-page`, …) — never a raw hex
   code, `px`, or `rem` value, and never Tailwind's arbitrary-value
   `[...]` escape hatch.

Change a token once — in the theme editor or in `tokens.css` — and every
component that uses it updates automatically.

### Color

Colors are **schemes**, not one-off settings. `settings_schema.json` defines
a `color_scheme_group` (`scheme-1`, `scheme-2`, `scheme-3` by default: light,
dark/inverse, warm). Every section has a **Color scheme** setting; changing
a scheme's colors in the theme editor updates every section using it,
instantly, with no code change. Global accent colors (used for sale
badges, focus rings, success messages) live outside the scheme system in
the **Colors → Brand accents** settings, since they're meant to stay
consistent across schemes.

Tailwind utilities generated from the current scheme: `bg-background`,
`text-foreground`, `border-border`, `bg-button` / `text-button-foreground`,
`bg-button-secondary` / `text-button-secondary-foreground`, `text-link`,
`text-accent`, `text-sale`, `text-success`.

### Shape

One setting — **Style → Corner radius** — drives `--radius-base`, from
which `tokens.css` derives the whole radius scale (`rounded-xs` through
`rounded-xl`) via `calc()` multiples. Move the slider once; buttons, cards,
inputs and images all follow.

### Typography

`--font-body` / `--font-heading` come from the theme editor's font pickers.
Headings use a fluid type scale (`text-display`, `text-h1`, `text-h2`,
`text-h3`, `text-body-lg`) built with `clamp()`, so headings resize smoothly
between mobile and desktop without ever writing a `sm:`/`md:`/`lg:` font
size ladder in a component. `Typography → Heading/Body text size` scales
the whole scale up or down globally.

### Spacing & layout

Tailwind v4's spacing scale is a single token (`--spacing`, default
`0.25rem`); every numbered utility (`p-4`, `gap-2`, …) is a multiple of it.
On top of that, `tokens.css` adds named layout tokens driven by the
**Layout** settings group: `max-w-page` (page width), `px-page-x` /
`px-page-x-lg` (mobile/desktop page padding), `py-section-y` /
`py-section-y-sm` (space between sections). Use the `.container-page` and
`.section-y` component classes (`assets/components.css`) rather than
repeating these utilities by hand.

## Folder structure

```
assets/
  tokens.css         Design tokens (Tailwind @theme blocks) — start here
  base.css           Resets and bare-element styles
  components.css     Small reusable classes (.btn-primary, .card, …)
  tailwind.input.css Build entry point (imports the three files above)
  tailwind.output.css  Compiled CSS — generated, but committed
  theme.js           All theme JS: cart drawer, Ajax add-to-cart, variant picker

snippets/
  theme-variables.liquid  Writes every token's runtime value from settings
  icon.liquid             Single SVG icon sprite (`{% render 'icon', name: '...' %}`)
  price.liquid            Price + compare-at-price + sale badge
  product-card.liquid     Grid card used on collection/search/featured-collection
  product-form.liquid     Add-to-cart form (progressively enhanced)
  cart-items.liquid       Cart line items, shared by the drawer and /cart page

sections/
  header.liquid, footer.liquid, announcement-bar.liquid
  hero-banner.liquid, value-props.liquid, featured-collection.liquid,
  image-with-text.liquid, testimonials.liquid, newsletter.liquid
  main-product.liquid, main-collection.liquid, main-cart.liquid,
  main-search.liquid, main-404.liquid
  cart-drawer.liquid      Rendered once in layout/theme.liquid on every page

templates/    JSON templates wiring sections above to each route
locales/      en.default.json — every user-facing string in the theme
```

## Cart

The cart drawer (or full page, if **Cart → Cart type** is set to "Page") is
powered by Shopify's Ajax Cart API (`/cart/add.js`, `/cart/change.js`) with
the `sections` parameter, so adding or updating an item re-renders the
header and cart drawer server-side and swaps them in — no client-side price
math. Every cart form still works with JavaScript disabled (plain POSTs to
`/cart/add` and `/cart`).
