---
"reskill": minor
---

feat: support custom agent targets beyond the built-in list

- Skills can now be installed into directories that are not part of the built-in agent table. Declare an alias → directory under a new `customAgents` field in `skills.json` (e.g. `"cc-switch": { "path": ".cc-switch/skills", "globalPath": "~/.cc-switch/skills" }`), then use that alias anywhere a built-in agent name is accepted — `-a`, `defaults.targetAgents`, `list -a`, and `uninstall`
- The `-a` flag now accepts an `alias:path` form (e.g. `-a cc-switch:.cc-switch/skills`) that installs into an arbitrary directory. On a successful project install the alias is persisted into `skills.json` under `customAgents`, so later commands reuse it without repeating the path
- `path` is a project-relative directory (required). `globalPath` is an absolute directory (a leading `~` expands to the home directory) used for `-g/--global` installs; a global install into a custom agent without `globalPath` is rejected with a clear error
- `doctor` now validates `customAgents` entries (non-empty, relative `path`) and no longer flags custom aliases in `targetAgents` as unknown agents
- The built-in `AgentType` union is widened to also accept arbitrary alias strings; built-in agent behavior is unchanged

---

feat: 支持内置列表之外的自定义 Agent 目标

- 现在可以把 skill 安装到不在内置 Agent 列表里的目录。在 `skills.json` 新增的 `customAgents` 字段里声明「别名 → 目录」（例如 `"cc-switch": { "path": ".cc-switch/skills", "globalPath": "~/.cc-switch/skills" }`），随后即可在任何接受内置 Agent 名的地方使用该别名——`-a`、`defaults.targetAgents`、`list -a` 以及 `uninstall`
- `-a` 现在支持 `别名:路径` 写法（例如 `-a cc-switch:.cc-switch/skills`），可安装到任意目录。项目级安装成功后，该别名会被写回 `skills.json` 的 `customAgents`，后续命令无需再重复路径即可复用
- `path` 是相对于项目根的目录（必填）。`globalPath` 是绝对目录（开头的 `~` 会展开为家目录），用于 `-g/--global` 安装；对未配置 `globalPath` 的自定义 Agent 执行全局安装会以清晰的错误被拒绝
- `doctor` 现在会校验 `customAgents` 条目（`path` 非空且为相对路径），并且不再把 `targetAgents` 中的自定义别名判定为未知 Agent
- 内置的 `AgentType` 联合类型放宽为同时接受任意别名字符串；内置 Agent 的行为保持不变
