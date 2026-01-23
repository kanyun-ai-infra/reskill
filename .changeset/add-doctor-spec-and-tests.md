---
"reskill": patch
---

Add doctor command specification and integration tests

**Changes:**

- Add `doctor` command specification to `docs/cli-spec.md` with full documentation including:
  - Command synopsis and options (`--json`, `--skip-network`)
  - All checks performed (environment, directory, configuration, network)
  - Expected behavior and exit codes
  - Output examples for success, warnings, and errors
  - JSON output format schema
- Add 26 integration tests for `doctor` command covering:
  - CLI options (`--help`, `--json`, `--skip-network`)
  - Environment checks (Node.js, Git, authentication, cache)
  - Configuration checks (skills.json, skills.lock sync status)
  - Installed skills validation
  - Configuration validation (registry conflicts, dangerous paths, invalid agents/refs)
  - Exit codes and JSON output format

**Bug Fixes:**

- Fix JSON output parsing in integration tests to handle update notifier being appended after JSON output

---

添加 doctor 命令规范文档和集成测试

**主要变更：**

- 在 `docs/cli-spec.md` 中添加 `doctor` 命令完整规范，包括：
  - 命令语法和选项（`--json`、`--skip-network`）
  - 所有检查项（环境、目录、配置、网络）
  - 预期行为和退出码
  - 成功、警告和错误的输出示例
  - JSON 输出格式说明
- 添加 26 个 `doctor` 命令集成测试，覆盖：
  - CLI 选项（`--help`、`--json`、`--skip-network`）
  - 环境检查（Node.js、Git、认证、缓存）
  - 配置检查（skills.json、skills.lock 同步状态）
  - 已安装 skills 验证
  - 配置验证（注册表冲突、危险路径、无效 agent/引用）
  - 退出码和 JSON 输出格式

**问题修复：**

- 修复集成测试中 JSON 输出解析问题，处理 update notifier 追加在 JSON 后面的情况
