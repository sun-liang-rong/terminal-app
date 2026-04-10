# Terminal MVP

一个功能强大的桌面端终端应用，基于 Electron + Vue 3 + xterm.js 构建，集成了真实终端模拟、SSH 客户端和 AI 助手功能。

## 功能特性

### 终端功能
- 多标签页终端 - 支持新建、切换、关闭标签
- 真实 Shell 交互 - 基于 node-pty 实现真实的本地终端
- 完整终端模拟 - 基于 xterm.js 6.0，支持 256 色和 True Color
- 自适应布局 - 终端大小随窗口自动调整
- 链接识别 - 自动识别并点击 URL 链接
- 终端搜索 - 内置搜索功能快速定位内容

### SSH 客户端
- SSH 连接管理 - 保存常用主机配置
- 密码加密存储 - 使用 Electron safeStorage 安全存储密码
- 远程终端 - 完整的 SSH 远程终端体验
- 多会话支持 - 同时管理多个 SSH 连接

### AI 助手
- 多模型支持 - OpenAI、Claude、Ollama、自定义 API
- 流式响应 - 实时显示 AI 回复
- 会话管理 - 支持多会话和历史记录持久化
- Markdown 渲染 - 代码高亮和格式化显示
- 虚拟滚动 - 高性能消息列表渲染

### 系统监控
- 实时 CPU 使用率显示
- 内存使用情况监控
- 磁盘空间统计
- 状态栏集成显示

### 用户体验
- 暗色/亮色主题切换
- 无边框窗口设计
- 自定义标题栏（最小化/最大化/关闭）
- 命令面板快捷访问
- Toast 通知系统
- 响应式侧边栏布局

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Electron 41 + Vue 3 |
| 终端 | xterm.js 6.0 + node-pty |
| SSH | ssh2 |
| 构建 | Vite + electron-vite |
| 样式 | 原生 CSS + CSS Variables |
| 图标 | Phosphor Icons |
| 虚拟滚动 | vue-virtual-scroller |
| Markdown | marked + highlight.js |

## 项目结构

```
terminal-app/
├── src/
│   ├── main/
│   │   └── index.ts          # Electron 主进程
│   ├── preload/
│   │   └── index.ts          # 预加载脚本（IPC 桥接）
│   ├── renderer/
│   │   └── index.ts          # 渲染进程入口
│   ├── components/
│   │   ├── Terminal.vue      # 本地终端组件
│   │   ├── SshTerminal.vue   # SSH 终端组件
│   │   ├── SshModal.vue      # SSH 连接弹窗
│   │   ├── SSHPanel.vue      # SSH 管理面板
│   │   ├── AssistantPanel.vue # AI 助手面板
│   │   ├── ChatSidebar.vue   # 聊天侧边栏
│   │   ├── VirtualMessageList.vue # 虚拟滚动消息列表
│   │   ├── ChatMessageItem.vue # 聊天消息项
│   │   ├── SettingsPanel.vue # 设置面板
│   │   ├── Sidebar.vue       # 主侧边栏
│   │   ├── Topbar.vue        # 标题栏
│   │   ├── Statusbar.vue     # 状态栏
│   │   ├── ResourceMonitor.vue # 资源监控
│   │   ├── CommandPalette.vue # 命令面板
│   │   ├── Modal.vue         # 模态框组件
│   │   ├── ToastContainer.vue # 通知容器
│   │   └── EmptyState.vue    # 空状态组件
│   ├── utils/
│   │   ├── aiChatService.ts  # AI 聊天服务
│   │   ├── aiModelsStore.ts  # AI 模型配置存储
│   │   ├── chatSessionStore.ts # 聊天会话管理
│   │   ├── settingsStore.ts  # 设置存储
│   │   ├── themeStore.ts     # 主题状态
│   │   ├── themes.ts         # 主题定义
│   │   ├── terminalStatus.ts # 终端状态管理
│   │   ├── notification.ts   # 通知系统
│   │   ├── modalManager.ts   # 模态框管理
│   │   ├── layoutStore.ts    # 布局状态
│   │   ├── performanceMonitor.ts # 性能监控
│   │   └── useResponsive.ts  # 响应式布局
│   ├── types/
│   │   ├── electron.d.ts     # Electron API 类型
│   │   ├── env.d.ts          # 环境类型
│   │   └── *.d.ts            # 其他类型声明
│   └── App.vue               # 根组件
├── build/
│   ├── icon.svg              # 应用图标（SVG）
│   ├── icon.ico              # Windows 图标
│   ├── icon.icns             # macOS 图标
│   └── icon.png              # Linux 图标
├── release/                  # 打包输出目录
├── package.json
├── electron.vite.config.ts   # electron-vite 配置
└── tsconfig.json             # TypeScript 配置
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
# 构建前端和 Electron
npm run build

# 打包为安装程序
npm run dist        # 当前平台
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

### 预览构建结果

```bash
npm run preview
```

## 配置说明

### AI 模型配置

在设置面板中配置 AI 提供商：

| 提供商 | 配置项 |
|--------|--------|
| OpenAI | API Key, Base URL (可选), Model ID |
| Claude | API Key, Base URL (可选), Model ID |
| Ollama | Base URL (默认 localhost:11434), Model ID |
| Custom | API Key, Base URL, Model ID |

常用模型 ID：
- OpenAI: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- Claude: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`
- Ollama: `llama3`, `mistral`, `codellama`

### SSH 主机配置

支持配置：
- 主机地址 (Host)
- 端口 (Port，默认 22)
- 用户名 (Username)
- 密码 (Password，加密存储)

### 终端设置

- 字体大小
- 主题切换

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+P` | 打开命令面板 |
| `Ctrl+T` | 新建终端标签 |
| `Ctrl+W` | 关闭当前标签 |
| `Ctrl+C` | 中断当前命令 / 复制选中内容 |
| `Ctrl+V` | 粘贴 |

## 安全特性

- Context Isolation 启用
- nodeIntegration 禁用
- 密码使用 Electron safeStorage 加密存储
- API Key 本地存储，不上传服务器
- AI 请求通过主进程代理，避免渲染进程直接访问网络

## 开发说明

### IPC 通信

渲染进程通过 `window.electronAPI` 访问主进程功能：

```typescript
// 终端操作
await window.electronAPI.ptyCreate({ id: 'terminal-1', cols: 80, rows: 24 })
await window.electronAPI.ptyWrite({ id: 'terminal-1', data: 'ls\n' })

// SSH 连接
await window.electronAPI.sshConnect({ host: 'example.com', port: 22, username: 'user', password: 'pass' })

// AI 聊天
await window.electronAPI.aiChatStream({ provider: 'openai', apiKey: '...', model: 'gpt-4o', messages: [...] })

// 系统信息
const info = await window.electronAPI.getSystemInfo()
```

### 添加新组件

1. 在 `src/components/` 创建 Vue 组件
2. 在 `src/App.vue` 或父组件中引入
3. 使用 `themeStore` 获取当前主题样式

## 后续计划

- [ ] 终端分屏功能
- [ ] SFTP 文件传输
- [ ] 终端会话录制与回放
- [ ] 更多主题预设
- [ ] 国际化支持
- [ ] 自动更新功能

## 许可证

MIT License

## 致谢

- [xterm.js](https://xtermjs.org/) - 终端模拟
- [node-pty](https://github.com/microsoft/node-pty) - 伪终端
- [ssh2](https://github.com/mscdex/ssh2) - SSH 客户端
- [Phosphor Icons](https://phosphoricons.com/) - 图标库