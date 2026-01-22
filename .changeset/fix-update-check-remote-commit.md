---
"reskill": patch
---

Check remote commit before reinstalling and unify file exclusion rules

**Bug Fixes:**
- Add `checkNeedsUpdate()` to compare local lock commit with remote commit
- Add `getRemoteCommit()` to fetch remote commit via `git ls-remote`
- Skip update when local and remote commits match, avoiding unnecessary reinstallation
- Unify file exclusion rules between Installer and CacheManager:
  - Export `DEFAULT_EXCLUDE_FILES` (README.md, metadata.json, .reskill-commit)
  - Export `EXCLUDE_PREFIX` ('_') for internal files
- Update `copyDir()` to support `excludePrefix` option
- Add comprehensive tests for update logic and file exclusion

---

在重新安装前检查远程提交并统一文件排除规则

**问题修复：**
- 添加 `checkNeedsUpdate()` 方法比较本地锁定提交与远程提交
- 添加 `getRemoteCommit()` 方法通过 `git ls-remote` 获取远程提交
- 当本地和远程提交匹配时跳过更新,避免不必要的重新安装
- 统一 Installer 和 CacheManager 之间的文件排除规则:
  - 导出 `DEFAULT_EXCLUDE_FILES` (README.md, metadata.json, .reskill-commit)
  - 导出 `EXCLUDE_PREFIX` ('_') 用于内部文件
- 更新 `copyDir()` 支持 `excludePrefix` 选项
- 添加更新逻辑和文件排除的完整测试
