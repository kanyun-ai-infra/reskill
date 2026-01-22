---
"reskill": minor
---

Separate semantic version from Git reference in skills.lock (npm-style)

Added a new `ref` field to `skills.lock` to store the Git reference (tag, branch, or commit), while the `version` field now stores the semantic version from `skill.json`. This follows npm's approach where version comes from package.json, not the Git ref.

**ref field values by scenario:**
| Input | ref | version |
|-------|-----|---------|
| `@v1.0.0` | `v1.0.0` | from skill.json or `v1.0.0` |
| `@latest` | resolved tag (e.g. `v2.1.0`) | from skill.json or the tag |
| `@master` | `master` | from skill.json or `master` |
| `@branch:feature-x` | `feature-x` | from skill.json or `feature-x` |
| `@commit:abc1234` | `abc1234` | from skill.json or `abc1234` |

---

将语义化版本与 Git 引用在 skills.lock 中分离存储（npm 风格）

在 `skills.lock` 中新增 `ref` 字段用于存储 Git 引用（tag、分支或 commit），而 `version` 字段现在存储来自 `skill.json` 的语义化版本。这与 npm 的处理方式一致，版本号来自 package.json 而非 Git 引用。

**不同场景下 ref 字段的值：**
| 输入 | ref | version |
|------|-----|---------|
| `@v1.0.0` | `v1.0.0` | 来自 skill.json 或 `v1.0.0` |
| `@latest` | 解析后的 tag（如 `v2.1.0`） | 来自 skill.json 或该 tag |
| `@master` | `master` | 来自 skill.json 或 `master` |
| `@branch:feature-x` | `feature-x` | 来自 skill.json 或 `feature-x` |
| `@commit:abc1234` | `abc1234` | 来自 skill.json 或 `abc1234` |
