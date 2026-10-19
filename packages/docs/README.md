# @paywright/docs

Source for the Paywright documentation site, built with
[Starlight](https://starlight.astro.build). It's deployed to Cloudflare by
`.github/workflows/docs.yml` on every push to `main` that changes the docs or
the API spec.

```bash
npm run dev -w packages/docs       # http://localhost:4321
npm run build -w packages/docs     # static site in packages/docs/dist
```

- Pages live in `src/content/docs/`. Add a page there and list it in the
  `sidebar` in `astro.config.mjs`.
- The **API reference** under `/api/` is generated at build time from
  `packages/template/openapi.json`. Don't write it by hand: run
  `npm run openapi:generate` in `packages/template` after changing the API.
