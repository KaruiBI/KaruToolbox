# Karui 工具箱开发知识库

这组文档用于把 Karui 工具箱继续发展为“本地优先、AI 增强、可长期记忆的智能创作工作台”。它既是产品路线图，也是交给后续 AI/开发者的上下文。

## 阅读顺序

1. [AI 接手指南](./AI-CONTINUATION-GUIDE.md)：先了解当前项目、边界和不能破坏的内容。
2. [智能创作产品路线图](./KARUI-CREATOR-ROADMAP.md)：了解产品最终要成为怎样的软件，以及分阶段目标。
3. [创作内核与用户记忆架构](./KARUI-CREATOR-ARCHITECTURE.md)：实现工程、时间线、渲染、AI Skill 和记忆系统时遵循的技术设计。
4. [下一阶段任务清单](./NEXT-AI-TASKS.md)：每个任务都带范围、前置条件和验收标准；一次只领取一个任务。
5. [工作日志](./WORKLOG.md)：查看已经完成、正在开发、仅完成设计的真实进度。

## 一句话方向

Karui 不做另一个功能堆砌的剪映克隆，而是做一个能理解用户习惯、同时连接本地与远程 AI、兼顾普通工具与专业创作工程的桌面工作台。

## 文档维护规则

- 功能状态变化后同步更新这组文档，不要只改代码。
- 新的架构决定写入“架构决策记录”，不要悄悄替换数据模型。
- 文档里的 `P0/P1/P2` 是产品优先级，不等于可跳过依赖关系。
- 未经确认，不更换 Tauri、FFmpeg、ComfyUI，也不进行全项目框架重写。
- 所有会保存到用户磁盘的数据都必须有版本号、迁移方案、导出方式和删除方式。

## 可直接交给其他 AI 的启动提示

```text
你正在继续开发 Karui 工具箱。开始前请完整阅读：
1. toolknit-desktop/docs/AI-CONTINUATION-GUIDE.md
2. toolknit-desktop/docs/KARUI-CREATOR-ROADMAP.md
3. toolknit-desktop/docs/KARUI-CREATOR-ARCHITECTURE.md
4. toolknit-desktop/docs/NEXT-AI-TASKS.md

然后运行 git status -sb，保护用户尚未提交的修改。本次只领取一个任务，先说明任务编号、范围、依赖和明确不做的内容，再开始实现。不要把新编辑器逻辑继续追加到 src/main.js；不要全量格式化大文件；完成后执行文档规定的验证并回写完成记录。未经用户明确要求，不提交、不推送、不打包。
```
