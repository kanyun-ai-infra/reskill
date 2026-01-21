# reskill Architecture

## Overview

reskill is a Git-based package manager for AI agent skills. It follows an architecture similar to npm/pnpm, providing declarative configuration (`skills.json`), version locking (`skills.lock`), and global caching.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                                                                 │
│   CLI Commands: init, install, list, info, update, outdated    │
│                 uninstall, link, unlink                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SkillManager                             │
│                    (Core Orchestrator)                          │
│                                                                 │
│   - Coordinates all skill operations                            │
│   - Manages installation workflow                               │
│   - Handles multi-agent distribution                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ GitResolver │     │CacheManager │     │  Installer  │
│             │     │             │     │             │
│ - Parse refs│     │ - Cache ops │     │ - Symlink   │
│ - Resolve   │     │ - degit     │     │ - Copy      │
│   versions  │     │ - Storage   │     │ - Multi-    │
│ - Build URLs│     │             │     │   agent     │
└─────────────┘     └─────────────┘     └─────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ConfigLoader │     │ LockManager │     │AgentRegistry│
│             │     │             │     │             │
│ - skills.   │     │ - skills.   │     │ - Agent     │
│   json      │     │   lock      │     │   types     │
│ - Read/     │     │ - Version   │     │ - Paths     │
│   Write     │     │   tracking  │     │ - Detection │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Module Descriptions

### CLI Layer (`src/cli/`)

Entry point for command-line operations. Each command is implemented as a separate module.

```
src/cli/
├── index.ts              # CLI entry point, registers all commands
└── commands/
    ├── index.ts          # Re-exports all commands
    ├── init.ts           # Initialize skills.json
    ├── install.ts        # Install skills
    ├── list.ts           # List installed skills
    ├── info.ts           # Show skill details
    ├── update.ts         # Update skills
    ├── outdated.ts       # Check for outdated skills
    ├── uninstall.ts      # Remove skills
    ├── link.ts           # Link local skill for development
    └── unlink.ts         # Unlink local skill
```

### Core Layer (`src/core/`)

Business logic implementation.

#### SkillManager (`skill-manager.ts`)

The main orchestrator that integrates all components.

```typescript
class SkillManager {
  // Core operations
  install(ref: string, options?: InstallOptions): Promise<InstalledSkill>
  installAll(options?: InstallOptions): Promise<InstalledSkill[]>
  uninstall(name: string): boolean
  update(name?: string): Promise<InstalledSkill[]>
  list(): InstalledSkill[]
  getInfo(name: string): SkillInfo
  
  // Local development
  link(localPath: string, name?: string): InstalledSkill
  unlink(name: string): boolean
  
  // Multi-agent support
  installToAgents(ref: string, agents: AgentType[], options?: InstallOptions): Promise<InstallResult>
  uninstallFromAgents(name: string, agents: AgentType[]): Map<AgentType, boolean>
  
  // Utilities
  checkOutdated(): Promise<OutdatedResult[]>
  getDefaultTargetAgents(): Promise<AgentType[]>
}
```

#### GitResolver (`git-resolver.ts`)

Parses skill references and resolves versions.

```typescript
class GitResolver {
  // Parse skill reference string
  parseRef(ref: string): ParsedSkillRef
  
  // Parse version specification
  parseVersion(versionSpec: string): ParsedVersion
  
  // Resolve to specific version
  resolve(ref: string): Promise<ResolvedSkill>
  resolveVersion(repoUrl: string, version: ParsedVersion): Promise<ResolvedVersion>
  
  // Build Git URL from parsed ref
  buildRepoUrl(parsed: ParsedSkillRef): string
}
```

**Skill Reference Formats:**
- `github:user/repo@v1.0.0` - GitHub with exact version
- `gitlab:group/repo@latest` - GitLab with latest tag
- `gitlab.company.com:team/repo@^1.0.0` - Custom registry with semver range
- `user/repo` - Short format using default registry

**Version Types:**
- `@v1.0.0` - Exact version (tag)
- `@latest` - Latest semver tag
- `@^2.0.0` - Semver range (>=2.0.0 <3.0.0)
- `@branch:develop` - Specific branch
- `@commit:abc1234` - Specific commit

#### CacheManager (`cache-manager.ts`)

Manages global cache at `~/.reskill-cache/`.

```typescript
class CacheManager {
  // Check if cached
  get(parsed: ParsedSkillRef, version: string): Promise<CacheResult | null>
  
  // Cache from remote
  cache(repoUrl: string, parsed: ParsedSkillRef, version: string, ref: string): Promise<CacheResult>
  
  // Copy cached skill to destination
  copyTo(parsed: ParsedSkillRef, version: string, destPath: string): Promise<void>
  
  // Get cache directory path
  getCachePath(parsed: ParsedSkillRef, version: string): string
}
```

**Cache Structure:**
```
~/.reskill-cache/
├── github/
│   └── user/
│       └── repo/
│           ├── v1.0.0/
│           └── v2.0.0/
└── gitlab.company.com/
    └── team/
        └── skill/
            └── v1.0.0/
```

#### ConfigLoader (`config-loader.ts`)

Handles `skills.json` configuration.

```typescript
class ConfigLoader {
  // Check if config exists
  exists(): boolean
  
  // Load configuration
  load(): SkillsJson
  
  // Get skill references
  getSkills(): Record<string, string>
  getSkillRef(name: string): string | undefined
  
  // Modify configuration
  addSkill(name: string, ref: string): void
  removeSkill(name: string): void
  
  // Get defaults
  getDefaults(): SkillsDefaults
  getInstallDir(): string
}
```

**skills.json Structure:**
```json
{
  "name": "my-project",
  "skills": {
    "planning": "github:user/planning@v1.0.0",
    "code-review": "gitlab:team/review@latest"
  },
  "defaults": {
    "registry": "github",
    "installDir": ".skills",
    "targetAgents": ["cursor", "claude-code"],
    "installMode": "symlink"
  },
  "registries": {
    "internal": "https://gitlab.company.com"
  }
}
```

#### LockManager (`lock-manager.ts`)

Manages `skills.lock` for reproducible installations.

```typescript
class LockManager {
  // Get locked skill info
  get(name: string): LockedSkill | undefined
  
  // Lock a skill
  lockSkill(name: string, info: LockedSkill): void
  
  // Remove from lock
  remove(name: string): void
  
  // Save changes
  save(): void
}
```

**skills.lock Structure:**
```json
{
  "lockfileVersion": 1,
  "skills": {
    "planning": {
      "source": "github:user/planning",
      "version": "v1.0.0",
      "resolved": "https://github.com/user/planning",
      "commit": "abc1234def5678901234567890abcdef12345678",
      "installedAt": "2025-01-21T10:30:00Z"
    }
  }
}
```

#### Installer (`installer.ts`)

Handles installation to multiple AI agents.

```typescript
class Installer {
  // Install to specific agents
  installToAgents(
    sourcePath: string,
    skillName: string,
    agents: AgentType[],
    options?: { mode: 'symlink' | 'copy' }
  ): Promise<Map<AgentType, InstallResult>>
  
  // Uninstall from agents
  uninstallFromAgents(
    skillName: string,
    agents: AgentType[]
  ): Map<AgentType, boolean>
}
```

#### AgentRegistry (`agent-registry.ts`)

Defines supported AI agents and their paths.

```typescript
// Supported agents
type AgentType = 
  | 'cursor' | 'cursor-rules'
  | 'claude-code' | 'claude-code-rules'
  | 'codex'
  | 'opencode'
  | 'windsurf' | 'windsurf-rules'
  | 'github-copilot'
  | 'cline' | 'roo-cline'
  | 'aider'
  | 'kilo-code' | 'trae'
  | 'amp';

// Agent configuration
interface AgentConfig {
  name: string;
  skillsPath: string;    // e.g., '.cursor/skills'
  rulesPath?: string;    // e.g., '.cursor/rules'
  supportsRules: boolean;
}

// Functions
function detectInstalledAgents(): AgentType[]
function getAgentConfig(type: AgentType): AgentConfig
function isValidAgentType(name: string): boolean
```

**Agent Installation Paths:**
| Agent | Skills Path | Rules Path |
|-------|-------------|------------|
| cursor | .cursor/skills | .cursor/rules |
| claude-code | .claude/skills | .claude/ (CLAUDE.md) |
| windsurf | .windsurf/skills | .windsurfrules |
| codex | .codex/skills | - |
| github-copilot | .github/skills | .github/copilot-instructions.md |

### Types Layer (`src/types/`)

TypeScript type definitions for the entire project.

```typescript
// Main configuration types
interface SkillsJson { ... }
interface SkillsLock { ... }
interface SkillJson { ... }  // Per-skill metadata

// Parsed types
interface ParsedSkillRef { ... }
interface ParsedVersion { ... }
interface InstalledSkill { ... }

// Operation types
interface InstallOptions { ... }
interface InstallResult { ... }
```

### Utils Layer (`src/utils/`)

Shared utility functions.

#### fs.ts - File System Utilities
```typescript
exists(path: string): boolean
readJson<T>(path: string): T
writeJson(path: string, data: unknown): void
remove(path: string): void
ensureDir(path: string): void
createSymlink(target: string, path: string): void
isSymlink(path: string): boolean
copyDir(src: string, dest: string): void
getGlobalSkillsDir(): string
```

#### git.ts - Git Operations
```typescript
getTags(repoUrl: string): Promise<string[]>
getLatestTag(repoUrl: string): Promise<string>
getCommitHash(repoUrl: string, ref: string): Promise<string>
```

#### logger.ts - Logging
```typescript
logger.info(message: string): void
logger.success(message: string): void
logger.warn(message: string): void
logger.error(message: string): void
logger.debug(message: string): void
logger.package(message: string): void  // For package operations with 📦
```

## Data Flow

### Installation Flow

```
1. User runs: reskill install github:user/skill@v1.0.0
                    │
2. Parse reference ─┘
   GitResolver.parseRef()
   → { registry: 'github', owner: 'user', repo: 'skill', version: 'v1.0.0' }
                    │
3. Resolve version ─┘
   GitResolver.resolve()
   → Get exact commit hash for v1.0.0
                    │
4. Check cache ─────┘
   CacheManager.get()
   → Return cached if exists
                    │
5. Download ────────┘ (if not cached)
   CacheManager.cache()
   → Use degit to download, cache locally
                    │
6. Install ─────────┘
   Copy from cache to .skills/ (or target agents)
                    │
7. Update config ───┘
   ConfigLoader.addSkill()  → Update skills.json
   LockManager.lockSkill()  → Update skills.lock
```

### Multi-Agent Installation Flow

```
1. Determine target agents
   - From --agents option
   - Or from skills.json defaults.targetAgents
   - Or detect installed agents
                    │
2. For each agent ──┘
   Installer.installToAgents()
   - Create symlink: .cursor/skills/my-skill → ~/.reskill-cache/.../my-skill
   - Or copy files if --copy mode
                    │
3. Report results ──┘
   - Success count
   - Failed agents
```

## Design Principles

1. **Git as Registry** - No additional service needed, any Git repo is a skill source
2. **Declarative Config** - skills.json clearly expresses project dependencies
3. **Version Locking** - skills.lock ensures team consistency
4. **Zero Invasion** - Does not modify existing project structure
5. **Global Cache** - Avoid redundant downloads
6. **Multi-Agent Support** - One skill, deploy to multiple AI agents

## Testing Strategy

Each module has a corresponding `.test.ts` file:

```
skill-manager.ts → skill-manager.test.ts
git-resolver.ts → git-resolver.test.ts
cache-manager.ts → cache-manager.test.ts
...
```

Tests use:
- Temporary directories for file system operations
- Mocked network calls for Git operations
- Real file system for integration tests (marked with `.skip`)
