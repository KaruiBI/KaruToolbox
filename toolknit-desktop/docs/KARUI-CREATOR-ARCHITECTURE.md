# Karui 创作内核、AI Skill 与用户记忆架构

## 1. 总体结构

```text
Karui UI
├─ 素材库 / 预览器 / 时间线 / 检查器 / AI 助手
├─ Editor Store（工程状态）
├─ Command Bus（可撤销编辑命令）
└─ Services
   ├─ Project Service
   ├─ Media Service
   ├─ Render Service
   ├─ AI Provider Service
   ├─ Skill Runtime
   └─ Memory Service
          │ Tauri IPC（结构化参数）
Rust Core
├─ project/  工程文件、迁移、自动保存
├─ media/    ffprobe、缩略图、波形、代理
├─ render/   FFmpeg 计划、队列、进度、取消
├─ ai/       ComfyUI 与本地模型进程管理
├─ memory/   SQLite、导入导出、迁移
└─ security/ 路径、URL、权限、密钥引用
```

首轮不要重写整个前端。新编辑器应作为独立 feature 进入现有应用，逐步抽取共享服务。

## 2. 建议目录

```text
src/
  core/
    event-bus.js
    command-bus.js
    job-client.js
    i18n.js
  features/
    editor/
      index.js
      editor-store.js
      project-schema.js
      commands/
      timeline/
      media-bin/
      preview/
      inspector/
      subtitles/
    memory/
    skills/
    comfy/
  services/
    tauri-client.js
    media-service.js
    render-service.js
    project-service.js
    memory-service.js
  styles/
    tokens.css
    editor.css

src-tauri/src/
  lib.rs
  commands/
    mod.rs
    project.rs
    media.rs
    render.rs
    memory.rs
    comfy.rs
  domain/
    project.rs
    timeline.rs
    job.rs
    memory.rs
  services/
    ffmpeg.rs
    project_store.rs
    memory_store.rs
    process_manager.rs
```

`lib.rs` 只负责注册 command、插件和应用生命周期，不继续堆业务实现。

## 3. Karui Project v1

工程建议使用可读 JSON，扩展名 `.karuiproject`。第一版不直接引入 OpenTimelineIO 运行时，但数据命名和时间模型尽量兼容其思想，后续增加 OTIO adapter。

### 3.1 顶层结构

```json
{
  "schema": "karui.project",
  "schemaVersion": 1,
  "projectId": "uuid",
  "name": "未命名工程",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "settings": {
    "width": 1920,
    "height": 1080,
    "frameRate": { "num": 30000, "den": 1001 },
    "sampleRate": 48000,
    "colorSpace": "bt709",
    "background": "#000000"
  },
  "assets": {},
  "sequences": {},
  "activeSequenceId": "uuid",
  "memoryRefs": [],
  "metadata": {}
}
```

### 3.2 资产

每个 asset 至少包含：

- `id`：UUID；
- `kind`：video/audio/image/subtitle/generated；
- `uri`：原文件绝对路径或 provider URI；
- `relativeUri`：当素材位于工程附近时可选；
- `fingerprint`：文件大小、修改时间和可选 hash，用于重新链接；
- `probe`：时长、流、编码、帧率、旋转、色彩信息；
- `proxy`、`thumbnail`、`waveform`：派生缓存引用；
- `origin`：import/comfy/ai/render；
- `parentAssetId`：AI 修图和版本链关系；
- `promptSnapshot`、`workflowSnapshot`：生成素材的可追溯信息。

### 3.3 序列和轨道

```json
{
  "id": "sequence-id",
  "name": "主时间线",
  "tracks": [
    {
      "id": "v1",
      "kind": "video",
      "name": "V1",
      "locked": false,
      "muted": false,
      "items": []
    }
  ],
  "markers": [],
  "durationTicks": 0
}
```

时间使用整数 tick。推荐 `ticksPerSecond = 1_000_000`，或采用有理数时间；不要将浮点秒作为持久化唯一值。

### 3.4 Clip

```json
{
  "id": "clip-id",
  "type": "clip",
  "assetId": "asset-id",
  "timelineStart": 0,
  "duration": 5000000,
  "sourceIn": 1200000,
  "sourceDuration": 5000000,
  "enabled": true,
  "transform": {
    "position": [0.5, 0.5],
    "scale": [1, 1],
    "rotation": 0,
    "opacity": 1
  },
  "audio": {
    "gainDb": 0,
    "pan": 0,
    "fadeIn": 0,
    "fadeOut": 0
  },
  "effects": [],
  "keyframes": {},
  "metadata": {}
}
```

字幕使用单独 `subtitle` item，至少包含 `text`、`start`、`duration`、`styleId`、`speakerId`、`words[]`。

## 4. 编辑命令与撤销

所有时间线修改都必须是 command：

```js
{
  id: crypto.randomUUID(),
  type: 'clip.split',
  payload: { sequenceId, trackId, clipId, atTick },
  issuedAt: Date.now(),
  source: 'user' // user | ai | skill | import
}
```

命令必须：

- 先校验再执行；
- 返回 inverse command 或保存最小 before state；
- 支持合并连续拖动，避免一次拖动生成几百条历史；
- 可序列化到恢复日志；
- AI 和 Skill 使用与用户相同的 command，不允许直接改 store；
- 对批量 AI 操作用 transaction，用户一次撤销即可回退。

首批命令：`asset.import`、`clip.insert`、`clip.move`、`clip.trim`、`clip.split`、`clip.delete`、`track.add`、`subtitle.update`、`audio.gain`、`project.setting.update`。

## 5. 渲染系统

### 5.1 前端提交 RenderPlan

前端不提交任意 FFmpeg 参数字符串，而提交结构化计划：

```json
{
  "projectId": "uuid",
  "sequenceId": "uuid",
  "range": { "start": 0, "duration": 30000000 },
  "output": {
    "path": "D:\\Exports\\video.mp4",
    "container": "mp4",
    "videoCodec": "h264",
    "audioCodec": "aac",
    "width": 1920,
    "height": 1080,
    "frameRate": { "num": 30, "den": 1 },
    "quality": "standard"
  },
  "burnSubtitles": true
}
```

Rust 侧：

1. 读取工程快照并校验所有 asset；
2. 将时间线编译成规范化 render graph；
3. 同规格无效果片段可评估 concat demuxer；
4. 不同规格、多轨、字幕、变换统一使用 filter_complex 和重编码；
5. 输出到临时文件，成功后原子移动到最终路径；
6. 解析 `-progress pipe:1`，向前端发送 job progress；
7. 取消时杀死进程树并删除未完成临时文件。

### 5.2 统一 Job

```json
{
  "jobId": "uuid",
  "kind": "render",
  "state": "queued",
  "progress": 0,
  "stage": "probing",
  "createdAt": "ISO-8601",
  "startedAt": null,
  "finishedAt": null,
  "canCancel": true,
  "output": null,
  "error": null
}
```

状态只能按 `queued -> running -> succeeded|failed|cancelled` 迁移。ComfyUI、FFmpeg、转录、代理和缩略图以后都走这一套。

## 6. 预览、代理和缓存

- 原始素材不复制、不修改；
- 导入后异步生成缩略图、波形和可选代理；
- cache 路径按 `projectId/assetId/fingerprint` 隔离；
- cache 可删除并重建，不属于工程真相；
- 预览第一版用 `<video>` + Canvas/DOM overlay；
- 时间线拖动期间可降分辨率，不用追求首版逐像素等同最终导出；
- 代理与原片必须共享相同逻辑时间和旋转信息；
- 素材 fingerprint 改变后标记 stale，不静默使用旧缓存。

## 7. 字幕和语音

字幕统一内部模型，再实现 SRT/VTT/ASS adapter。不要在 UI 中直接以 SRT 文本作为状态。

自动转录 provider 接口：

```ts
transcribe({
  assetUri,
  language,
  range,
  wordTimestamps,
  speakerDiarization,
  devicePreference
}) -> Job<Transcript>
```

第一版 provider：本地 whisper.cpp。以后可增加用户自配远程 provider。模型包必须带版本、大小、SHA-256、来源和许可证信息；下载失败可续传；CPU/GPU 自动回退需要明确提示。

## 8. 参考图修图架构

当前最重要的缺口是“输入图片进入 ComfyUI”。需要：

1. `comfy_upload_asset`：上传 image/mask 到 `/upload/image`，返回服务端文件引用；
2. `ReferenceAsset`：原图、参考图、遮罩、用途和权重；
3. `WorkflowTemplate`：有版本的工作流模板与输入映射；
4. 预设：inpaint、outpaint、upscale、background remove、style reference；
5. 遮罩画布：画笔、橡皮、反选、羽化、撤销；
6. 结果资产记录 `parentAssetId`，生成时保存 prompt/workflow/model/seed；
7. 本地和远程端点都通过同一 provider 接口；
8. 远程服务上传前显示文件大小和隐私确认。

不要硬编码特定自定义节点存在。每个 workflow template 声明 `requiredNodes` 和 `requiredModels`，运行前用 `/object_info` 和模型清单检测。

## 9. AI Provider 与 Skill

### 9.1 Provider

Provider 负责“如何调用能力”：

- `text.generate`
- `image.generate`
- `image.edit`
- `video.generate`
- `speech.transcribe`
- `media.analyze`

配置包括 providerId、endpoint、模型、能力、是否本地、隐私级别和 secretRef。真实密钥只保存在安全存储，不进入工程和记忆。

### 9.2 Skill manifest v1

```json
{
  "schema": "karui.skill",
  "schemaVersion": 1,
  "id": "karui.talking-head.clean-cut",
  "version": "1.0.0",
  "name": { "zh": "口播精剪", "en": "Talking Head Clean Cut" },
  "capabilities": ["speech.transcribe", "timeline.edit", "subtitle.write"],
  "permissions": ["project.read", "project.proposeEdits"],
  "inputs": {},
  "steps": [],
  "outputs": ["editProposal", "subtitleTrack"]
}
```

第一版 Skill 只允许：

- 调用白名单 provider；
- 读取当前工程明确授权的数据；
- 生成中间结构和编辑建议；
- 通过 command transaction 应用用户确认的修改；
- 写自己的受控缓存。

第一版不允许：任意执行 shell、静默联网、读取工程外任意文件、读取密钥、自动覆盖原素材。

## 10. 用户记忆系统

### 10.1 记忆不是聊天日志

应保存有长期价值、能被解释的数据：

- `preference`：默认分辨率、编码、字幕样式；
- `brand`：品牌名、颜色、字体、Logo、禁用项；
- `creative_style`：喜欢的镜头、节奏、画面风格；
- `reference`：用户主动保存的参考图或范例；
- `instruction`：长期指令，例如“不要自动上传素材”；
- `decision`：用户确认过的项目决定；
- `template`：常用工程和导出预设。

不默认保存：完整私密聊天、原文件内容、人脸特征、密码、Token、API Key。

### 10.2 作用域

- `global`：所有项目；
- `workspace`：某个创作空间/品牌；
- `project`：只对当前工程；
- `session`：关闭即丢弃。

### 10.3 SQLite 表

建议使用官方 Tauri SQL 插件接 SQLite；数据库位于 AppConfig，使用 migration 初始化。[Tauri SQL 插件](https://v2.tauri.app/fr/plugin/sql/)

核心表：

```text
schema_migrations
profiles
workspaces
projects
assets
memories
memory_asset_links
prompt_library
skills
skill_runs
jobs
```

`memories` 字段建议：

```text
id, scope_type, scope_id, kind, key, value_json,
source_type, source_ref, confidence, sensitivity,
user_confirmed, created_at, updated_at, expires_at, deleted_at
```

### 10.4 写入原则

- 用户明确说“记住”时可直接创建候选，仍需显示保存结果；
- AI 推断的偏好先作为 suggestion，不自动变成 confirmed memory；
- 每条记忆能回答“从哪里来的、何时保存、影响哪些功能”；
- 冲突时项目 > workspace > global；显式设置 > 推断；新确认 > 旧确认；
- 敏感记忆默认不导出，必须单独勾选。

### 10.5 导出/导入

扩展名建议 `.karuimemory`，本质是 ZIP：

```text
manifest.json
memories.jsonl
profiles.json
templates/
references/       # 用户选择“包含参考素材”时才有
checksums.sha256
```

`manifest.json` 必须包含 schemaVersion、appVersion、exportedAt、counts、includedScopes、assetsIncluded、encryption。

导出永不包含：API Key、Token、Cookie、密码、本地绝对路径、ComfyUI 访问令牌。

导入流程：校验 checksum → 读取 manifest → 预览数量和敏感项 → 选择合并/覆盖/跳过 → 按稳定 ID 与 `(scope, kind, key)` 处理冲突 → 生成导入报告。导入必须可撤销或创建导入前备份。

## 11. 安全和许可

- 远程 AI 上传必须由用户明确触发；UI 标识本地/远程。
- URL 仅允许 http/https；本地调试和远程服务分别配置。
- 文件路径全部 canonicalize 后再校验作用域；不使用用户输入拼 shell。
- 下载模型、节点和运行时必须固定版本并校验 SHA-256；当前直接下载第三方主分支 ZIP 的方式应改为版本清单。
- ComfyUI、模型、节点、FFmpeg、Whisper 各自有独立许可证；安装页和 About 页展示第三方清单。
- Skill 包必须有 manifest、hash、来源和权限；未来再考虑签名。
- 用户数据导出要做 ZIP Slip 防护，导入文件名不能穿越目标目录。

## 12. 架构决策记录（ADR）

### ADR-001：继续使用 Tauri + Rust + FFmpeg

状态：接受。原因：现有基础成熟、本地文件能力强、适合 Windows 桌面和可取消子进程。

### ADR-002：新编辑器模块化，不全量重写旧工具

状态：接受。原因：全量重写风险大；编辑器可在独立 feature 中建立新规范，再渐进抽取共享服务。

### ADR-003：工程与媒体分离

状态：接受。工程保存编辑信息和引用；媒体保持原位，支持重新链接和可选打包。

### ADR-004：本地 SQLite 作为长期记忆真相

状态：建议接受。`localStorage` 仅保留轻量 UI 状态；结构化记忆、工程索引、任务和迁移进入 SQLite。

### ADR-005：AI 通过命令建议修改工程

状态：接受。AI 不直接改文件或 store，所有操作可预览、可撤销、可追踪。

### ADR-006：Skill 首版为声明式受控流程

状态：接受。先保证安全与可维护性，再逐步开放第三方扩展。

