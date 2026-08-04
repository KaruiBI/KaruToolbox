# Karui 工具箱

Karui 工具箱是一款本地多功能桌面工具应用，集成 PDF、图片、音频、视频、文本、计算器、创意设计和 AI 辅助工具。

## 主要特点

- 文件处理在本地完成
- 支持 PDF 合并、拆分、旋转、压缩和加密
- 支持图片格式转换、压缩和图标生成
- 支持音频与视频转换、裁剪和提取
- 内置常用文本、计算器和创意工具
- 支持中文与英文界面，默认使用中文

## 开发运行

```powershell
cd toolknit-desktop
npm install
npm run dev
```

默认访问地址：`http://127.0.0.1:1420`

## 桌面端运行

桌面端需要安装 Node.js 20+、Rust stable，并将 `ffmpeg.exe` 放入：

```text
toolknit-desktop/src-tauri/resources/ffmpeg/ffmpeg.exe
```

然后运行：

```powershell
npm run tauri dev
```

## 开源许可

- 原项目版权与 MIT License 保留在 [LICENSE](LICENSE)。
- Karui 工具箱新增或重写的全部内容，包括界面、功能逻辑、交互、配置、桌面端代码、构建与打包脚本及文档，由 Mr·Fan 和 dk-plus 以 [MIT License](LICENSE-KARUI) 开源。
- 版权归属说明见 [NOTICE](NOTICE)。
