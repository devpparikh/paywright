---
title: CLI
description: Options for create-paywright-app.
---

```bash
npx create-paywright-app [project-name] [options]
```

| Option | Description |
|---|---|
| `[project-name]` | Name of the project and target directory. Lowercase letters, digits, hyphens, dots and underscores; must start with a letter or digit |
| `-y`, `--yes` | Accept all defaults with no prompts (for CI). Requires a project name |
| `--skip-install` | Don't run `npm install` |

Without `--yes`, the CLI prompts for anything you didn't pass:

| Prompt | Default |
|---|---|
| Project name | `paywright-service` |
| Install dependencies now? | Yes |
| Copy `.env.example` to `.env`? | Yes |

The target directory must not exist or must be empty. The generated
`package.json` is renamed to your project name with version `0.1.0`.

## CI example

```bash
npx create-paywright-app payments --yes --skip-install
```
