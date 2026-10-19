---
title: Other languages
description: Generate a typed Paywright client for Python, Go, Java or any other language.
---

The service describes its whole API with an OpenAPI spec. It's served live at
`/api/docs`, and you can export it to a file **without booting the app**. No
Postgres or Redis is needed, so this runs in CI:

```bash
npm run openapi:generate     # writes openapi.json
```

Feed that spec to [OpenAPI Generator](https://openapi-generator.tech/)
(requires Java 11+) to produce a typed client in any language:

```bash
# TypeScript (axios): the generator behind @paywright/sdk
openapi-generator-cli generate -i openapi.json -g typescript-axios -o ./client

# Python, Go, Java, ...: swap the -g generator
openapi-generator-cli generate -i openapi.json -g python -o ./client-python
```

Protected endpoints declare the `x-api-key` security scheme, so generated
clients attach the key from their own configuration automatically.

If you add endpoints to your scaffolded service, regenerate the spec and your
client together so they stay in step.
