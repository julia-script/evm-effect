# @evm-effect/docs

The documentation site for [evm-effect](https://github.com/julia-script/evm-effect):
[Next.js](https://nextjs.org) + [Fumadocs](https://fumadocs.dev) + Tailwind CSS,
with an API reference generated from the packages' TSDoc comments.

## Commands

```bash
pnpm dev     # generate the API reference, then start the dev server
pnpm build   # generate the API reference, then build for production
pnpm api     # regenerate content/docs/api only
pnpm check   # type-check the app
```

Run these from the repository root as `pnpm docs:dev` / `pnpm docs:build` /
`pnpm docs:api` to get the workspace packages built first — the API generation
reads the published type declarations, so `pnpm build` must have run at least
once for the packages this site documents.

## Layout

| Path | Description |
| ---- | ----------- |
| `content/docs` | Hand-written guides (MDX) |
| `content/docs/api` | **Generated** API reference — git-ignored, rebuilt by `pnpm api` |
| `lib/source.ts` | Fumadocs content source; collections are defined with the Macro API |
| `lib/layout.shared.tsx` | Shared layout options (nav, links, GitHub URL) |
| `scripts/generate-api-docs.ts` | Runs TypeDoc and converts its markdown into Fumadocs content |
| `typedoc.json` | TypeDoc entry points and markdown output options |

Sidebar order comes from `meta.json` files: hand-written ones for the guides,
generated ones for the API reference.

## How the API reference is generated

1. TypeDoc runs in [packages mode](https://typedoc.org/documents/Options.Input.html#entrypointstrategy)
   over every published package. Shared options live in `../../typedoc.base.json`
   and each package contributes its entry point in `packages/*/typedoc.json`.
2. `typedoc-plugin-markdown` writes plain markdown to `.typedoc`.
3. `scripts/generate-api-docs.ts` flattens `@evm-effect/<pkg>` to `<pkg>`,
   rewrites every cross-reference, adds frontmatter and writes the `meta.json`
   files, leaving the result in `content/docs/api`.

To document a new package, add it to the `entryPoints` in `typedoc.json` and to
`PACKAGES` in `scripts/generate-api-docs.ts`, then give it a `typedoc.json` like
the existing ones.
