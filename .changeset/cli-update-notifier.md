---
"reskill": minor
---

Add non-blocking CLI update notifier

**New Feature:**
- CLI now automatically checks for updates from npm registry on startup
- Displays a friendly notification when a newer version is available
- Non-blocking design with 3-second timeout, won't interrupt normal workflow
- Errors are silently handled to ensure smooth user experience

**New Module (`src/utils/update-notifier.ts`):**
- `checkForUpdate()` - Check latest version from npm registry
- `formatUpdateMessage()` - Format update notification message
- `notifyUpdate()` - Non-blocking update notification

**Documentation Updates:**
- Updated README to recommend `npx reskill@latest` for consistent versioning
- Added note explaining npx may use cached older versions without `@latest`
- Updated all command examples in both English and Chinese documentation

---

添加非阻塞式 CLI 更新通知

**新功能：**
- CLI 启动时自动从 npm registry 检查更新
- 有新版本可用时显示友好的更新提示
- 非阻塞设计，3 秒超时，不会影响正常工作流
- 错误静默处理，确保用户体验流畅

**新模块 (`src/utils/update-notifier.ts`):**
- `checkForUpdate()` - 从 npm registry 检查最新版本
- `formatUpdateMessage()` - 格式化更新提示消息
- `notifyUpdate()` - 非阻塞式更新通知

**文档更新：**
- 更新 README，推荐使用 `npx reskill@latest` 以确保版本一致性
- 添加说明：不加 `@latest` 时 npx 可能使用缓存的旧版本
- 更新中英文文档中的所有命令示例
