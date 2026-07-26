# Pi Web

[English](./README.md) | [日本語](./README.ja.md)

[pi 编程智能体](https://github.com/badlogic/pi-mono) 的本地网页界面和 macOS 桌面应用。它会读取本机的 pi 会话文件，在浏览器里提供会话管理、实时对话、模型配置、技能管理和项目文件预览。

## 快速开始

**无需安装，直接运行：**

```bash
bunx @agegr/pi-web@latest
```

**或全局安装后使用：**

```bash
bun install -g @agegr/pi-web
pi-web
```

启动后打开 [http://localhost:30141](http://localhost:30141)。命令行版本会在服务就绪后尝试自动打开浏览器。

**可选参数：**

```bash
pi-web --port 8080              # 自定义端口
pi-web --hostname 127.0.0.1     # 仅本机访问
pi-web -p 8080 -H 127.0.0.1     # 组合使用
pi-web --no-open                # 不自动打开浏览器

PORT=8080 pi-web                # 也支持环境变量
PI_WEB_NO_OPEN=1 pi-web         # 适用于后台服务或开机自启
```

## HTTP 代理

Pi Web 的服务端模型请求和 API 请求会读取标准的 `HTTP_PROXY`、`HTTPS_PROXY` 和 `NO_PROXY` 环境变量。

macOS 或 Linux：

```bash
HTTP_PROXY=http://127.0.0.1:7890 \
HTTPS_PROXY=http://127.0.0.1:7890 \
NO_PROXY=localhost,127.0.0.1 \
bunx @agegr/pi-web@latest
```

Windows PowerShell：

```powershell
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:NO_PROXY = "localhost,127.0.0.1"
bunx @agegr/pi-web@latest
```

## 功能介绍

- **把历史工作接回来**：打开网页就能按项目找到以前的 pi 对话，不必在终端里翻文件或记住会话路径。
- **放心试不同方向**：可以从某条历史消息重新开始，也可以复制出一条独立的新路线，探索方案时不怕弄乱原来的对话。
- **跨分支工作**：在侧边栏切换 Git worktree，让新会话和 Explorer 跟随你选择的 checkout。
- **边聊边看项目文件**：左侧浏览项目文件，右侧打开源码、文档、图片、音频和 PDF；文件变化会自动刷新，适合边让 agent 改边检查结果。
- **随时掌握会话状态**：在顶部就能看到上下文占用、花费、压缩结果和系统提示，长会话不再像黑箱。
- **少离开当前界面**：模型、运行时配置、登录/API key、插件、模型测试和技能开关都能在网页里处理，配置 agent 时不用在多个工具之间来回切换。
- **更快审查本地改动**：可从侧边栏的 review 面板查看 Git status/diff。

## 注意事项

- **数据目录**：默认读取 `~/.pi/agent/sessions` 下的会话文件。可通过环境变量 `PI_CODING_AGENT_DIR` 指定其他 pi agent 目录。
- **会话文件**：路径形如 `~/.pi/agent/sessions/<编码后的工作目录>/<时间戳>_<uuid>.jsonl`。
- **模型配置**：Models 面板读写 pi agent 目录下的 `models.json`，模型列表和默认模型由 pi 的配置解析得到。
- **文件访问**：文件浏览和预览面向当前选择的项目目录，以及会话中已出现过的工作目录。
- **Git worktree**：什么时候显示切换器、新建目录在哪里、删除会影响什么，见 [Pi Web 里的 Worktree](./docs/worktrees.zh-CN.md)。
- **Fork 与会话内分支不同**：Fork 会创建新的 `.jsonl` 文件；“Edit from here” 是同一会话文件里的分支。

## macOS 桌面应用

Pi Web 提供基于 Electron 的原生 macOS 桌面应用，在原生窗口中运行相同的 Web UI，并支持：

- 原生目录和文件选择器
- macOS 应用菜单（文件、编辑、视图、跳转）
- 窗口失焦时的原生通知
- 剪贴板图片粘贴到提示词
- 从文件标签中「在 Finder 中显示」和「用编辑器打开」
- 每次启动生成独立的安全令牌

**下载**：从 [GitHub Releases](https://github.com/agegr/pi-web/releases) 获取最新 `.dmg` 或 `.zip`。

首次启动：右键点击 → 打开（未签名应用的 Gatekeeper 提示）。详见[桌面应用文档](./docs/desktop.md)。

## Pi 配置兼容性

Pi Web 从 `~/.pi/agent/settings.json` 和 `~/.pi/agent/models.json` 读取配置。支持的配置项：`defaultProvider`、`defaultModel`、`defaultThinkingLevel`、`compaction`、`retry`、`branchSummary`、`packages`、`prompts`、`enabledModels`。仅 CLI 使用的配置（`piStatus`、`transport`、`theme`、遥测）将被忽略。

完整兼容性列表见 [Pi 运行时兼容性](./docs/pi-runtime-compat.md)。

## 安全模型

- **Web 模式**：通过 `proxy.ts` 进行来源检查 — 拒绝跨域 API 请求。
- **桌面模式**：来源检查加上每次启动生成的 64 位十六进制令牌。所有 `/api/*` 请求都需要 `X-Pi-Desktop-Auth` 头。
- **文件访问**：限定在会话工作目录和明确允许的根目录内。阻止符号链接逃逸。
- **密钥**：API 密钥、令牌和提供商凭据绝不会通过 API 返回。配置面板仅显示状态和占位符。
- **禁止远程访问**：服务器默认绑定 `127.0.0.1`，不面向网络暴露。

## 开发

```bash
bun install
bun run dev
```

本地开发端口为 [http://localhost:30141](http://localhost:30141)。

常用检查：

```bash
node_modules/.bin/tsc --noEmit
bun run lint
```

开发时不要运行 `next build` / `bun run build`，它会写入 `.next/`，容易影响正在运行的 dev server。发布流程再执行构建。

## 项目结构

```
app/
  api/
    agent/          # 创建/驱动 AgentSession，提供 SSE 事件流
    auth/           # OAuth 和 API key 管理
    cwd/validate/   # 自定义工作目录校验
    default-cwd/    # 获取 pi 默认工作目录
    file-index/     # 项目文件索引，用于快速搜索/导航
    files/          # 文件列表、读取、预览、watch
    git/            # 本地 Git status 和 diff API
    home/           # 当前用户 home 目录
    models/         # 可用模型、默认模型、thinking levels
    models-config/  # 读写 models.json、测试模型
    pi/             # 运行时配置摘要和刷新接口
    plugins/        # package plugin 管理
    sessions/       # 会话读取、重命名、删除、上下文、HTML 导出
    skills/         # skills 列表、搜索、更新、安装、启停
    worktrees/      # Git worktree 列表/创建/删除
components/
  AppShell.tsx          # 主布局、URL 状态、面板、文件标签
  SessionSidebar.tsx    # 项目选择、会话树、Explorer、review 面板
  ChatWindow.tsx        # 消息区、SSE、拖拽图片、minimap
  ChatInput.tsx         # 输入栏、模型/工具/thinking/compact/slash controls
  MessageView.tsx       # 消息、thinking、tool call/result 渲染
  BranchNavigator.tsx   # 会话内分支切换器
  DiffViewer.tsx        # 本地 Git diff 查看器
  ModelsConfig.tsx      # 模型和认证配置面板
  PiRuntimeConfig.tsx   # 运行时配置摘要面板
  PluginsConfig.tsx     # 插件管理面板
  SkillsConfig.tsx      # 技能管理面板
  FileExplorer.tsx      # 文件树和模糊文件搜索
  FileViewer.tsx        # 源码、diff、图片、音频、PDF、DOCX 预览
  MarkdownBody.tsx      # Markdown/Mermaid/KaTeX 渲染
lib/
  rpc-manager.ts        # AgentSessionWrapper 生命周期和全局 registry
  session-reader.ts     # 解析 .jsonl 会话文件和分支上下文
  normalize.ts          # 规范化 toolCall 字段名
  file-access.ts        # 文件读取安全边界和 allowed roots
  file-paths.ts         # 文件路径编码/相对路径工具
  git-status.ts         # 本地 Git status 工具
  git-changes.ts        # 本地 diff 解析/工具
  markdown.ts           # Markdown/Mermaid/KaTeX 插件配置
  models-cache.ts       # 模型/提供商发现缓存
  skills-service.ts     # skill 列表/搜索/安装/更新支持
  worktree.ts           # project/worktree 解析和操作
  http-dispatcher.ts    # 服务端 fetch 的 HTTP(S) 代理配置
  server-auth.ts        # desktop auth token 校验
hooks/
  useAgentSession.ts    # 会话加载、发送命令、SSE 状态机
  useAudio.ts           # 完成提示音
  useDragDrop.ts        # 图片拖拽
  useKeyboardShortcuts.ts # 应用快捷键
  useTheme.ts           # 主题切换
bin/
  pi-web.js             # CLI 入口
instrumentation.ts      # 初始化服务端 HTTP dispatcher
desktop/
  src/main/             # Electron 主进程：窗口、sidecar、菜单、日志、安全
  src/preload/          # 渲染进程 contextBridge API
```
