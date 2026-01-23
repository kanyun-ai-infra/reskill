---
"reskill": minor
---

Support installing multiple skills in a single command

**Changes:**
- `reskill install` now accepts multiple skill references as arguments
- Batch installation shows a summary of all skills being installed
- Reports both successful and failed installations in batch mode
- Exits with code 1 if any skill in the batch fails

**Usage:**
```bash
# Install multiple skills at once
reskill install github:user/skill1 github:user/skill2@v1.0.0 gitlab:team/skill3

# Still supports single skill
reskill install github:user/skill

# Still supports reinstall all (no args)
reskill install
```

---

支持在单个命令中安装多个 skills

**变更内容:**
- `reskill install` 现在支持多个 skill 引用作为参数
- 批量安装会显示所有要安装的 skills 摘要
- 在批量模式下会报告成功和失败的安装结果
- 如果批量中有任何 skill 失败，则以退出码 1 退出

**使用方式:**
```bash
# 一次安装多个 skills
reskill install github:user/skill1 github:user/skill2@v1.0.0 gitlab:team/skill3

# 仍然支持单个 skill
reskill install github:user/skill

# 仍然支持重新安装全部（无参数）
reskill install
```
