<div align="center">

# reskill

**Git-based Skills Package Manager for AI Agents**

*Declarative skill management like npm/Go modules — install, version, sync, and share AI agent skills*

[![npm version](https://img.shields.io/npm/v/reskill.svg)](https://www.npmjs.com/package/reskill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

English | [简体中文](./README.zh-CN.md)

</div>

---

## Quick Start

```bash
# 1. Initialize project
reskill init

# 2. Install a skill
reskill install github:anthropics/skills/frontend-design@latest

# 3. List installed skills
reskill list
```

## What is reskill?

reskill is a **Git-based package manager** for AI agent skills, similar to npm or Go modules. It provides declarative configuration, version locking, and seamless synchronization for managing skills across projects and teams.

**Supports:** Cursor, Claude Code, Codex, OpenCode, Windsurf, GitHub Copilot, and more.

## Why reskill?

reskill offers **fine-grained skill management and synchronization**:

### Local Experience

- **Declarative config** — `skills.json` clearly expresses project dependencies
- **Global cache** — Avoid redundant downloads, speed up installation
- **Local development** — Use `link` to develop and debug skills locally

### Engineering-Grade Management

- **Version locking** — `skills.lock` ensures team consistency
- **Flexible versioning** — Support exact versions, semver ranges, branches, and commits
- **Git as Registry** — No additional services needed, any Git repo is a skill source

### Cross-Project Sync

- **Version controlled** — Commit `skills.json` and `skills.lock` to your repo
- **CI integration** — Run `reskill install` in CI to verify dependencies
- **Multi-registry** — Support GitHub, GitLab, and private repositories

### Flexible Version Strategy

```json
{
  "skills": {
    "frontend-design": "github:anthropics/skills/frontend-design@latest",
    "code-review": "github:team/code-review@v2.1.0",
    "testing": "github:team/testing@^1.0.0"
  }
}
```

When running `reskill update`:
- `@latest` skills automatically update to the newest tag
- `@v2.1.0` stays locked
- `@^1.0.0` updates to the latest 1.x.x version

## Installation

```bash
# Global install
npm install -g reskill

# Or use npx
npx reskill <command>
```

## Usage

### Source Formats

```bash
# GitHub shorthand
reskill install github:user/skill@v1.0.0

# Full URL
reskill install https://github.com/user/skill

# GitLab
reskill install gitlab:group/skill@latest

# Private registry
reskill install gitlab.company.com:team/skill@v1.0.0

# Default registry (from skills.json)
reskill install user/skill@v1.0.0
```

### Version Specification

| Format | Example | Description |
|--------|---------|-------------|
| Exact | `@v1.0.0` | Lock to specific tag |
| Latest | `@latest` | Get the latest tag |
| Range | `@^2.0.0` | Semver compatible (>=2.0.0 <3.0.0) |
| Branch | `@branch:develop` | Specific branch |
| Commit | `@commit:abc1234` | Specific commit hash |

## Commands

| Command | Description |
|---------|-------------|
| `reskill init` | Initialize `skills.json` in current directory |
| `reskill install [skill]` | Install skills from `skills.json` or a specific skill |
| `reskill list` | List installed skills |
| `reskill info <skill>` | Show skill details |
| `reskill update [skill]` | Update all or specific skill |
| `reskill outdated` | Check for outdated skills |
| `reskill uninstall <skill>` | Remove a skill |
| `reskill link <path>` | Link local skill for development |
| `reskill unlink <skill>` | Unlink a local skill |

Run `reskill <command> --help` for detailed options.

## Configuration

### skills.json

```json
{
  "name": "my-project",
  "skills": {
    "planning": "github:user/planning-skill@v1.0.0",
    "code-review": "gitlab:team/code-review@latest"
  },
  "defaults": {
    "registry": "github",
    "installDir": ".skills"
  },
  "registries": {
    "internal": "https://gitlab.company.com"
  }
}
```

### skills.lock

The lock file records exact versions and commit hashes to ensure reproducible installations across your team.

## Multi-Agent Support

reskill works with all major AI coding agents. Skills are installed to the `.skills/` directory by default and can be integrated with any agent.

| Agent | Integration Path |
|-------|------------------|
| Cursor | `.cursor/rules/` or `.cursor/skills/` |
| Claude Code | `.claude/skills/` |
| Codex | `.codex/skills/` |
| OpenCode | `.opencode/skills/` |
| Windsurf | `.windsurf/skills/` |
| GitHub Copilot | `.github/skills/` |

## Skill Repository Structure

Each skill repository should follow this structure:

```
my-skill/
├── skill.json           # Metadata (required)
├── SKILL.md             # Main entry document (required)
├── README.md            # Repository description
└── templates/           # Template files (optional)
```

### skill.json

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "A skill for ...",
  "author": "Your Name",
  "license": "MIT",
  "entry": "SKILL.md",
  "keywords": ["ai", "skill"]
}
```

## Project Structure

After installation:

```
my-project/
├── skills.json          # Dependency declaration
├── skills.lock          # Version lock file
└── .skills/             # Installation directory
    ├── planning/
    │   ├── skill.json
    │   └── SKILL.md
    └── code-review/
        ├── skill.json
        └── SKILL.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SKPM_CACHE_DIR` | Global cache directory | `~/.reskill-cache` |
| `DEBUG` | Enable debug logging | - |

## Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Acknowledgements

reskill was inspired by and references the implementations of these excellent projects:

- [add-skill](https://github.com/vercel-labs/add-skill) by Vercel Labs
- [skild](https://github.com/Peiiii/skild) by Peiiii
- [openskills](https://github.com/numman-ali/openskills) by Numman Ali

Thanks to these projects for pioneering the AI agent skills ecosystem!

## Related Links

- [Agent Skills Specification](https://agentskills.io)

## License

MIT
