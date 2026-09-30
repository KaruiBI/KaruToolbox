# Karui 工具箱工作日志

> 本文只记录真实完成状态。“已有设计”不等于“已经实现”，“实验可用”不等于“生产稳定”。

## 当前总体状态（2026-09-30）

| 模块 | 状态 | 完成程度说明 |
|---|---|---|
| Karui 品牌与桌面壳 | 可用基线 | 名称、图标、安装器、系统托盘、中英界面和主要视觉风格已建立；默认窗口已扩大，已有全局最大化/关闭、退出或最小化到托盘选择，彻底退出会清理受管服务和 AI 连接。 |
| PDF/图片/音频/文本工具 | 已有可用功能 | 多个工具已有真实处理逻辑，但业务集中在大型文件中，测试覆盖不足。 |
| 普通视频工具 | 基础可用 | 已有格式转换、统一媒体探测、音频提取和 FFmpeg 基础；尚不是完整多轨剪辑器。 |
| AI 文本工具 | 可用但需用户配置 | 已支持多个平台和自定义端点；密钥当前仍在 localStorage，后续应迁移安全存储。 |
| ComfyUI 图片生成 | 已集成 | 支持本地/远程连接、模型检测、提示词预设、工作流和结果保存；模型可在程序内下载、暂停和续传，但引擎仍需用户选择外部 ComfyUI。 |
| ComfyUI 视频生成 | 实验可用 | 已支持 Wan、MiniMax H3 低显存流程、首尾帧、环境检测和节点安装；不同节点版本和模型组合仍可能不兼容。 |
| 内置 ComfyUI 运行时 | 已完成方案，尚未实现 | 已确定独立 sidecar、统一 AI 数据目录、运行时 manifest、离线包和模型共享策略；当前尚未随 Karui 分发或自动安装 ComfyUI。 |
| 可视化节点工作台 | 已完成方案，尚未实现 | 当前只有快速表单和 ComfyUI API JSON 导入，没有拖拽节点画布；人物、声音、字幕、口型、时间线将通过 Karui 高层业务节点连接。 |
| 系统能力检测 | 已完成首版 | 桌面端可检测 CPU、内存、GPU、显存并给出模型档位建议；AI 工作台运行时显示实时负载。NVIDIA 支持显存占用和温度，其他显卡的实时指标取决于 Windows 性能计数器。 |
| 参考图修图 | 仅完成架构设计 | 尚缺图片/遮罩上传、遮罩编辑器、inpaint/outpaint 工作流和版本链。 |
| 专业视频创作工程 | 编辑器骨架与探测可用 | Project v1 schema、独立编辑器入口、素材导入、统一媒体探测、预览区、检查器和 V1/A1/S1 时间线骨架已完成；真实片段编辑、撤销栈、保存与渲染尚未实现。 |
| 用户记忆 | 后期规划 | 已确定 SQLite、作用域、来源、导入导出和隐私规则；按当前产品决策放到核心创作功能完成后再实现。 |
| AI Skill | 仅完成架构设计 | 已定义受控 manifest 方向；尚未实现 runtime 和权限系统。 |

### 对“整个新目标”的粗略判断

- 产品方向与技术路线：约 90%，已经能指导后续开发。
- 创作内核 Phase 0：约 40%，已完成工程 schema、独立编辑器模块骨架和统一媒体探测首版。
- 多轨视频编辑 MVP：约 18%，已具备素材导入与分析能力，但尚未形成真实剪辑闭环。
- 参考图 AI 修图：约 10%，已有 ComfyUI 通信基础，缺少输入和编辑链。
- 内置 ComfyUI 引擎：约 20%，下载、进程管理和外部连接能力可复用，但运行时分发、统一目录、校验和回滚尚未实现。
- 可视化节点工作台：约 5%，完成产品和架构方案，尚未开始画布与执行图代码。
- 用户记忆与 Skill：约 5%，目前主要是文档和数据设计。

这些百分比是工程成熟度估计，不是工期承诺。

## 已完成的重要工作

### 之前完成

- 将原 ToolKnit 品牌改为 Karui 工具箱；
- 更新 Karui 图标、作者和公司信息；
- 处理中文界面、动态背景和多个子页面样式；
- 修复设置跳转、文件夹打开、FFmpeg 资源和桌面打包相关问题；
- 增加 Karui 自有 MIT License 与版权说明；
- 将仓库远程切换到 `KaruiBI/KaruToolbox`；
- 集成本地/远程 ComfyUI 引擎；
- 增加图片生成、视频生成、工作流导入、模型中心、提示词工作台和结果保存；
- 完成 AI 创作工作台的大方向、架构和 15 个分阶段任务。

### 2026-09-23：项目盘点与开发知识库

- 盘点技术栈、现有功能、文件规模和主要风险；
- 明确产品定位：本地优先的智能创作工作台；
- 写入 AI 接手指南、产品路线图、创作架构和任务清单；
- 定义用户记忆的作用域、来源、确认、导入导出和安全规则；
- 定义受控 AI Skill 方向；
- 明确不继续把编辑器逻辑追加到 `src/main.js`。

验证：文档内部链接检查通过；前端构建和 Rust 检查通过。

### 2026-09-23：T001 Karui Project v1

新增：

- `src/features/editor/project-schema.js`；
- `tests/editor/project-schema.test.js`；
- 空工程、三片段工程、字幕工程和损坏工程 fixture；
- `npm run test:project-schema`。

已经支持：

- 创建带视频、音频、字幕默认轨道的空工程；
- 工程、设置、素材、序列、轨道和时间线项目校验；
- UUID、日期、有理帧率、整数 tick 校验；
- clip 到 asset、activeSequence 到 sequence 的跨引用检查；
- 重复轨道/项目 ID 检测；
- 未来 schemaVersion 默认拒绝、预检模式给警告；
- 稳定 JSON 序列化和往返解析；
- 中文路径素材样例；
- v1 明确拒绝尚未定义的变速片段。

验证结果：

```text
工程 schema 测试：9/9 通过
Vite 生产构建：通过
```

当前未做：

- `.karuiproject` 磁盘读写；
- 原子保存和自动保存；
- schema migration；
- 时间线 UI；
- FFmpeg 工程导出。

### 2026-09-23：系统能力检测与运行监控

新增：

- Rust `get_system_status` 桌面命令；
- Windows CPU、内存、GPU 与显存检测；
- NVIDIA `nvidia-smi` 实时 GPU 使用率、显存占用和温度读取；
- AI 引擎设置页的硬件卡片与模型档位建议；
- AI 工作台 CPU、内存、GPU、显存、温度实时状态条；
- `src/features/system/hardware-advisor.js` 和对应测试。

验证结果：

```text
硬件建议测试：4/4 通过
工程 schema 测试：9/9 通过
Vite 生产构建：通过
Rust cargo check --offline：通过（仅保留 2 个既有 unused import 警告）
```

限制：模型建议是按独立显存和系统内存给出的保守估算，不代表所有第三方 ComfyUI 工作流都能运行；浏览器预览无法读取本机真实硬件，须在 Tauri 桌面端查看。

### 2026-09-24：T003 独立编辑器模块骨架

新增：

- 视频分类下的“专业视频创作”入口；
- `src/features/editor/editor-shell.js` 与独立作用域样式；
- 素材库、播放器、属性检查器、时间线和顶部工程操作栏；
- 空工程默认 V1 视频轨、A1 音频轨、S1 字幕轨；
- 桌面端视频、音频、图片和字幕素材选择与素材卡片；
- Karui 蓝青动态氛围，并支持系统“减少动态效果”设置。

当前边界：这一阶段只建立编辑器产品壳和模块边界；素材还不能放入时间线，撤销/重做、工程保存与最终导出按钮仍处于禁用或占位状态。

### 2026-09-24：T004 统一媒体探测服务首版

新增：

- Rust `probe_media` 结构化命令与兼容旧功能的 `probe_video` 适配层；
- 使用 `ffprobe` 读取容器、时长、大小、码率和起始时间；
- 视频编码、分辨率、有理帧率、旋转、像素格式与色彩信息；
- 音频编码、采样率、声道布局与语言；
- 字幕流、快速文件指纹和结构化错误码；
- 编辑器导入后自动显示分析状态、分辨率、帧率、时长和文件大小；
- 安装包资源加入 `ffprobe.exe`，本机依赖已放入正确目录。

验证：Rust 解析测试 2/2、前端媒体探测测试 5/5；真实中文路径 PNG 已通过随包 `ffprobe` 探测。后续还需要补充无音轨、可变帧率、手机旋转视频等二进制 fixture 的长期回归覆盖。

### 2026-09-24：AI 视频与工作流体验重排

- 将原来混在长表单中的视频生成与自定义工作流拆成“快速视频 / 自定义工作流”双模式；
- 快速视频按“准备环境、描述画面与动作、选择成片规格”三步组织；
- 模型明细默认收起，减少首次进入时的信息压力；
- 自定义工作流直接提供导入区和 JSON 编辑区，不再藏在页面最底部；
- 自定义工作流模式严格走工作流解析，不再因 JSON 为空而误走 Wan 视频生成；
- 生成操作固定在控制栏底部，长内容滚动时仍能看到主要动作；
- 新增独立 `comfy-studio-ux.css`，所有规则限定在 AI 工作台内，避免影响其他子页面。

验证：中英文词条 JSON 解析通过，Vite 生产构建通过，既有媒体探测测试 5/5 通过。当前桌面截图服务不可用，仍需在真实窗口中做一次人工视觉检查。

### 2026-09-29：桌面窗口、安全退出与内置模型下载

- 默认窗口调整为 1400×900，并提高最小可用尺寸；
- 无边框窗口增加全局最大化/还原和关闭按钮；
- 关闭时让用户选择彻底退出或最小化到系统托盘；
- 彻底退出时停止受管 ComfyUI、模型下载任务和前端 AI 连接；
- 模型下载改为程序内流式下载，支持进度、暂停和 `.part` 断点续传；
- 支持 Hugging Face 官方源、hf-mirror 镜像、环境代理和常见本地代理端口回退；
- SD/SDXL、Wan 和 MiniMax H3 相关直接模型链接已接入程序内下载；
- 下载文件按 checkpoints、diffusion_models、text_encoders、vae 和 clip_projections 分类保存；
- 修复下载按钮同时触发“打开目录”的事件冲突。

验证：Vite 生产构建通过；Rust `cargo check` 通过，保留 1 个既有 `CommandExt` 未使用警告。

当前限制：下载目标仍是用户选择的外部 ComfyUI 根目录；没有内置运行时、固定版本 manifest、SHA-256 模型清单和离线模型导入流程。

相关提交：窗口与安全退出 `099bdee`；程序内下载与网络回退 `61586d5`；H3 8GB 显卡判断修复 `4a8d9b5`。

### 2026-09-30：内置 AI 引擎与节点工作台方案

- 在仓库根目录新增 `KARUI-AI-NODE-STUDIO-PLAN.md`；
- 确定“快速创作 / 拖拽节点 / 高级 API JSON”三级产品结构；
- 确定人物设计、图片视频、声音、字幕、口型、时间线和输出节点范围；
- 确定高层节点编译到 ComfyUI、FFmpeg、语音 provider 和 Karui Command Bus；
- 确定 `AI/runtime` 与 `AI/data` 分离，升级引擎不移动模型和用户数据；
- 明确先完成内置引擎和统一目录，再开发可执行节点画布。

本项目前只有方案，没有把“节点工作台”标记为已实现。

### 2026-09-30：阶段 A 起步（内置引擎与统一目录）

按 `KARUI-AI-NODE-STUDIO-PLAN.md` §13 的顺序实施，本次完成第 1～3 步：

- 新增内置运行时清单 `src-tauri/ai-catalog/runtimes.json`（NVIDIA / CPU / 本地导入三种条目，含许可证、目录布局、入口参数；`sha256` 与 `sizeBytes` 留空待安装时实测写入）；
- 新增统一 AI 目录解析：`<存储位置>\AI\{runtime,data,cache,logs,manifests}`，`data` 下含 models 七个子目录与 `custom_nodes/input/output/temp/user`；
- 新增命令 `get_ai_paths`、`list_ai_runtime_catalog`、`get_ai_runtime_state`、`set_ai_runtime_installed`；
- `download_comfy_model` 的 `comfyPath` 改为可选：不传或传空时下载到内置统一模型目录，传外部目录仍走原逻辑。

验证：Rust `cargo check` 通过（仅保留既有 `CommandExt` 未使用警告）；catalog JSON 解析通过。

尚未实现：前端模型中心切换到统一目录的 UI，以及 AI 离线版的打包脚本。

### 2026-09-30：阶段 A 第 4 步（内置运行时安装、校验、启动、回滚）

- catalog 升级到 schemaVersion 2：每个运行时提供两种交付，`offline` 固定版本（ComfyUI v0.38.0，四个平台包均带实测 size 与 GitHub 发布的 sha256）与 `online` 最新版本（URL 用 `releases/latest/download`，安装前先查 GitHub Release API 取实际 size 与 digest）；
- 新增依赖 `sevenz-rust`（官方便携包是 7z）与 `sha2`；
- 新增命令：`install_ai_runtime`（下载/校验/解压/暂存/原子切换）、`cancel_ai_runtime_install`、`rollback_ai_runtime`、`start_ai_runtime`、`find_bundled_ai_runtime`；
- 安装流程：先下载到 `AI/cache` 并支持断点续传与代理回退 → 校验 sha256（无预置值时计算并记录）→ 解压到 `.staging` → 校验 `main.py` 与 `python_embeded/python.exe` → 旧版本改名为 `.previous` 后整体切换 → 写 `manifests/runtime-installed.json`（含 previous 供回滚）；
- 统一模型目录：安装后在便携包内写入 `extra_model_paths.yaml` 指向 `AI/data/models`；启动时传 `--output-directory AI/data/output`，端口自动避让 8188 起的占用；
- AI 离线版约定：把对应 7z 放在 exe 旁 `resources/ai-runtime/`，`find_bundled_ai_runtime` 自动识别，安装时无需联网。

验证：Rust `cargo check` 通过（仅保留既有 `CommandExt` 未使用警告）；catalog JSON 校验通过（5 个运行时 × offline/online）。

### 2026-09-30：内置引擎 UI（AI 引擎面板）

- 引擎面板顶部新增「内置引擎（推荐）」卡片：显卡类型下拉（NVIDIA / NVIDIA 旧卡 / AMD / Intel）、
  安装状态、进度条、四个按钮（安装内置引擎 / 下载最新版 / 启动内置引擎 / 回滚上一版）；
- `comfy-studio.js` 新增 `refreshBuiltinRuntimeState`、`installBuiltinRuntime`、`startBuiltinRuntime`、
  `rollbackBuiltinRuntime`，监听 `ai-runtime-install-progress`，打开引擎面板时自动刷新状态；
- 点「安装内置引擎」先查随包离线归档（`find_bundled_ai_runtime`），本机没有时自动改为在线下载；
- 启动内置引擎后回写服务地址并走现有连接测试；内置模式启用后模型下载不再要求用户选择 ComfyUI 目录，
  `download_comfy_model` 传空 `comfyPath`，模型落到统一目录 `AI/data/models`；
- 中英文案已补齐（`comfyStudio.builtin*`、`runtime*`）。

验证：esbuild 打包通过；locale JSON 解析通过。

尚未实现：离线版打包脚本（把 7z 放进 `resources/ai-runtime`）、真实 NVIDIA 机器上的离线出图闭环（阶段 A 第 5 步）。

### 2026-09-30：AI 引擎页面优化（信息层级）

按截图反馈调整首屏：

- 「内置引擎（推荐）」卡片上移到「系统能力检测」之前，第一屏直接看到显卡选择与一键安装；
- 「系统能力检测」默认折叠，标题右侧新增「查看详情 / 收起」，折叠时只显示一行摘要
  （CPU · 内存 · 显卡 · 显存），此前占满首屏的硬件网格与模型建议移入折叠区；
- 硬件卡片与引擎卡片宽度统一为 820px，卡片间距对齐；
- 硬件网格里的 CPU / GPU 名称改为最多两行显示，不再直接截断；
- 显卡类型按检测结果自动预选（NVIDIA / AMD / Intel），用户手动改过后不再覆盖；
- 安装按钮文案改为「一键安装内置引擎」与「下载最新版（联网）」，区分离线包与在线下载。

验证：esbuild 打包通过；`index.html` 标签配对与 DOM id 唯一性检查通过。

补充（同日）：显卡类型改为自动检测。

- 内置引擎卡片不再让用户选下拉框，改为一行识别结果（徽标 + 显卡型号 + 将安装哪个版本）；
- 显卡类型选择移入「手动选择显卡类型」折叠项，用户改过之后自动检测不再覆盖，并显示「已手动选择：…」；
- 未检测到独显时提示核显/CPU 生成很慢，建议兼容版本或云端 AI。

验证：esbuild 打包（JS/CSS）通过；locale JSON 解析通过；`index.html` section 19/19、div 1897/1897、details 8/8 配对。

补充（同日）：内置引擎与本地引擎合并为同一张卡片。

- 引擎面板不再有上下两块卡片，改为一个分段控件三个 tab：内置引擎 / 自己的 ComfyUI / Desktop 远程；
- 内置引擎内容（自动识别显卡、手动选择、安装进度、安装/下载/回滚按钮）作为 `#comfyBuiltinField`
  显示在 tab 下，`comfy-builtin-field` 控制显隐；
- 底部「保存并启动」按钮在内置模式下显示，文案自动变为「启动内置引擎」并调用 `start_ai_runtime`；
  「停止」按钮对两种模式都可见；
- 内置模式下隐藏底部通用状态行，避免与内置引擎自己的状态行重复；
- 默认引擎模式改为内置（老配置里已有的 `mode` 不会被覆盖）。

验证：esbuild 打包（JS/CSS）通过；`index.html` section 18/18、div 1898/1898、details 8/8 配对。

## 当前风险与技术债

1. `src/main.js`、`src/styles.css` 和 `index.html` 体积很大，新功能必须模块化。
2. 没有全项目测试体系；当前只给工程 schema 建立了第一组测试。
3. Vite 主 bundle 较大，有动态/静态混合导入警告。
4. Rust 当前仍有两处未使用的 `CommandExt` import 警告。
5. API Key 仍存于 localStorage。
6. ComfyUI 运行时、模型和第三方节点安装目前缺少固定版本和 checksum。
7. 节点画布尚未实现，现有“自定义工作流”只是 API JSON 导入，不应误称为可视化工作流编辑器。

## 下一步

当前产品决策是先完成 **T017：内置 ComfyUI 运行时与统一 AI 数据目录**，解决普通用户无法安装和配置 ComfyUI 的问题；随后推进 **T018：Karui 节点画布内核**。编辑器侧 T005 Command Bus 仍是节点输出进入时间线、实现可撤销修改的必要依赖。

## 工作日志更新规则

- 每完成一个任务追加日期、实现、验证、限制和下一步；
- 功能无法真实运行时写“实验”或“仅设计”，不能写“完成”；
- 提交代码后补充 commit hash；
- 发现旧功能退化时记录回归，不隐藏问题；
- 发布版本时从本日志提取用户可读内容写入 CHANGELOG，不直接复制技术细节。
