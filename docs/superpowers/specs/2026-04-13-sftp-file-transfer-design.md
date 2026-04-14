# SFTP 文件传输功能设计文档

## 1. 功能需求分析

### 1.1 核心功能

| 功能模块 | 具体能力 |
|---------|---------|
| **目录浏览** | 远程目录树导航、文件列表显示（名称、大小、修改时间、权限）、排序/筛选、路径导航栏 |
| **本地浏览** | 本地目录树导航、文件列表显示、快速访问常用目录 |
| **文件上传** | 单文件上传、多文件批量上传、文件夹递归上传、拖拽上传 |
| **文件下载** | 单文件下载、多文件批量下载、文件夹递归下载、拖拽下载 |
| **文件操作** | 删除文件/目录、重命名、新建目录 |
| **传输队列** | 任务列表、进度显示、暂停/继续/取消、失败重试、传输历史 |
| **状态同步** | 与 SSH 连接状态同步，断开时自动清理 SFTP 会话 |

### 1.2 已实现的后端 API

以下 API 已在 `src/main/index.ts` 中实现，无需额外开发：

- `sftpList` - 列出远程目录内容
- `sftpDownload` - 下载远程文件到本地
- `sftpUpload` - 上传本地文件到远程
- `sftpMkdir` - 创建远程目录
- `sftpDelete` - 删除远程文件
- `sftpRmdir` - 删除远程目录
- `sftpRename` - 重命名远程文件/目录
- `sftpStat` - 获取远程文件详情
- `sftpClose` - 关闭 SFTP 会话
- `onSftpProgress` - 传输进度监听

### 1.3 需补充的后端功能

- 本地文件系统 API（`localList`, `localMkdir`, `localDelete` 等）
- 批量传输 API（递归上传/下载目录）
- 文件选择对话框 API（`dialogOpen`, `dialogSave`）

---

## 2. 系统架构设计

### 2.1 模块划分

```
src/
├── main/
│   └── index.ts              # 主进程 - 补充本地文件系统 API
├── preload/
│   └── index.ts              # 预加载脚本 - 补充本地文件 API 暴露
├── types/
│   └── electron.d.ts         # 类型定义 - 补充本地文件类型
├── components/
│   ├── SftpPanel.vue         # SFTP 主面板（新增）
│   ├── LocalFileBrowser.vue  # 本地文件浏览器（新增）
│   ├── RemoteFileBrowser.vue # 远程文件浏览器（新增）
│   ├── TransferQueue.vue     # 传输队列面板（新增）
│   ├── FileListItem.vue      # 文件列表项组件（新增）
│   ├── PathBreadcrumb.vue    # 路径导航面包屑（新增）
│   └── FileContextMenu.vue   # 文件右键菜单（新增）
├── utils/
│   ├── sftpStore.ts          # SFTP 状态管理（新增）
│   ├── transferQueue.ts      # 传输队列管理（新增）
│   └── fileUtils.ts          # 文件工具函数（新增）
└── App.vue                   # 集成 SFTP 面板
```

### 2.2 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                        渲染进程 (Vue)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ LocalBrowser │  │RemoteBrowser │  │   TransferQueue      │  │
│  │    (本地)    │  │   (远程)     │  │  (传输任务管理)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    sftpStore.ts                          │  │
│  │  - sshId (关联 SSH 连接)                                  │  │
│  │  - localPath / remotePath (当前路径)                      │  │
│  │  - localFiles / remoteFiles (文件列表)                    │  │
│  │  - transferTasks (传输任务队列)                           │  │
│  └─────────────────────────────┬────────────────────────────┘  │
│                                │                                │
│                    IPC (window.electronAPI)                     │
│                                │                                │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                      主进程 (Electron)                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Local File API   │  │   SFTP API       │  │ SSH Client   │ │
│  │ (fs module)      │  │  (ssh2 SFTP)     │  │  (ssh2)      │ │
│  │                  │  │                  │  │              │ │
│  │ - local-list     │  │ - sftp-list      │  │ - sshId      │ │
│  │ - local-mkdir    │  │ - sftp-upload    │  │ - connection │ │
│  │ - local-delete   │  │ - sftp-download  │  │              │ │
│  │ - dialog-open    │  │ - sftp-mkdir     │  │              │ │
│  │ - dialog-save    │  │ - sftp-delete    │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              传输进度推送 (webContents.send)              │ │
│  │  - sftp-progress: { type, percent, total, transferred }  │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### 2.3 接口定义

#### 本地文件项

```typescript
interface LocalFileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modifyTime: number
  path: string
  isHidden?: boolean
}
```

#### 传输任务

```typescript
interface TransferTask {
  id: string
  type: 'upload' | 'download'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  localPath: string
  remotePath: string
  totalSize: number
  transferredSize: number
  percent: number
  startTime?: number
  endTime?: number
  error?: string
}
```

#### 本地文件 API（新增）

```typescript
interface LocalFileAPI {
  localList: (path: string) => Promise<{ success: boolean; items?: LocalFileItem[]; error?: string }>
  localMkdir: (path: string) => Promise<{ success: boolean; error?: string }>
  localDelete: (path: string) => Promise<{ success: boolean; error?: string }>
  localExists: (path: string) => Promise<boolean>
  dialogOpen: (options: DialogOptions) => Promise<string[] | null>
  dialogSave: (options: DialogOptions) => Promise<string | null>
}

interface DialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'createDirectory'>
}
```

---

## 3. 安全策略

### 3.1 认证方式

- 复用现有 SSH 连接的认证（密码/私钥），SFTP 会话通过 SSH 连接创建
- 密码使用 Electron `safeStorage` 加密存储（已实现）
- SFTP 会话与 SSH 连接绑定，断开 SSH 时自动清理 SFTP

### 3.2 数据加密

- SSH/SFTP 协议本身提供加密传输（ssh2 库实现）
- 本地存储的密码使用系统级加密（safeStorage）
- 传输过程中不缓存敏感数据

### 3.3 权限控制

- 远程文件操作权限由 SSH 服务器控制
- 本地文件操作权限由操作系统控制
- 应用层面不额外限制，遵循系统权限

### 3.4 安全最佳实践

- Context Isolation 启用（已实现）
- nodeIntegration 禁用（已实现）
- 文件路径验证，防止路径遍历攻击
- 传输前检查文件大小，防止超大文件传输导致内存溢出

---

## 4. 开发计划

### 4.1 任务分解

| 阶段 | 任务 | 预估工作量 | 优先级 |
|------|------|-----------|--------|
| **阶段 1：后端 API 补充** | | | |
| 1.1 | 本地文件系统 API（localList, localMkdir, localDelete） | 2h | 高 |
| 1.2 | 文件选择对话框 API（dialogOpen, dialogSave） | 1h | 高 |
| 1.3 | 批量传输 API（递归上传/下载目录） | 3h | 中 |
| 1.4 | 类型定义更新 | 0.5h | 高 |
| **阶段 2：前端基础组件** | | | |
| 2.1 | sftpStore.ts 状态管理 | 2h | 高 |
| 2.2 | fileUtils.ts 工具函数 | 1h | 高 |
| 2.3 | FileListItem.vue 文件列表项 | 2h | 高 |
| 2.4 | PathBreadcrumb.vue 路径导航 | 1h | 高 |
| 2.5 | FileContextMenu.vue 右键菜单 | 2h | 中 |
| **阶段 3：文件浏览器** | | | |
| 3.1 | LocalFileBrowser.vue 本地浏览器 | 4h | 高 |
| 3.2 | RemoteFileBrowser.vue 远程浏览器 | 4h | 高 |
| 3.3 | 拖拽传输功能 | 3h | 中 |
| **阶段 4：传输队列** | | | |
| 4.1 | transferQueue.ts 队列管理 | 2h | 高 |
| 4.2 | TransferQueue.vue 队列面板 | 3h | 高 |
| 4.3 | 任务暂停/取消/重试 | 2h | 中 |
| **阶段 5：主面板集成** | | | |
| 5.1 | SftpPanel.vue 主面板 | 4h | 高 |
| 5.2 | App.vue 集成与路由 | 2h | 高 |
| 5.3 | SSH 连接状态同步 | 1h | 高 |
| **阶段 6：测试与优化** | | | |
| 6.1 | 单元测试 | 3h | 中 |
| 6.2 | 集成测试 | 2h | 中 |
| 6.3 | 性能优化（大文件传输） | 2h | 低 |
| 6.4 | UI/UX 优化 | 2h | 低 |

**总预估工作量：约 40 小时**

### 4.2 里程碑

- **M1（第 1 周）**：后端 API 完成，基础组件完成
- **M2（第 2 周）**：文件浏览器完成，可浏览本地/远程文件
- **M3（第 3 周）**：传输队列完成，可上传/下载文件
- **M4（第 4 周）**：集成完成，测试通过，可发布

---

## 5. 测试方案

### 5.1 单元测试

| 测试模块 | 测试内容 | 测试工具 |
|---------|---------|---------|
| fileUtils.ts | 文件大小格式化、路径拼接、权限解析 | Vitest |
| sftpStore.ts | 状态管理逻辑、路径切换、文件列表更新 | Vitest |
| transferQueue.ts | 任务添加/删除、状态更新、进度计算 | Vitest |

### 5.2 集成测试

| 测试场景 | 测试内容 | 测试方法 |
|---------|---------|---------|
| SSH → SFTP 连接 | SSH 连接成功后自动创建 SFTP 会话 | 手动测试 + 自动化脚本 |
| 文件上传 | 上传文件到远程，验证文件完整性 | 手动测试 |
| 文件下载 | 下载远程文件，验证文件完整性 | 手动测试 |
| 批量传输 | 多文件上传/下载，验证队列管理 | 手动测试 |
| 断开重连 | SSH 断开后 SFTP 会话清理，重连后恢复 | 手动测试 |

### 5.3 安全测试

| 测试项 | 测试内容 | 测试方法 |
|-------|---------|---------|
| 路径遍历 | 尝试访问 `../` 等非法路径 | 手动测试 |
| 大文件传输 | 测试超大文件（>1GB）传输稳定性 | 手动测试 |
| 权限验证 | 测试无权限目录的操作限制 | 手动测试 |
| 密码安全 | 验证密码加密存储，无法直接读取 | 代码审查 |

### 5.4 测试环境

- 本地测试：Windows/macOS/Linux
- 远程服务器：Linux SSH 服务器（已有测试服务器）

---

## 6. 部署流程

### 6.1 构建命令

```bash
# 开发模式
npm run dev

# 构建前端和 Electron
npm run build

# 打包为安装程序
npm run dist        # 当前平台
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

### 6.2 打包配置

- `electron-builder` 配置已在 `package.json` 中
- 需确保 `ssh2` 和 `node-pty` 的 native 模块正确打包
- ASAR 打包时需 unpack native 模块（已配置）

### 6.3 发布流程

1. 版本号更新（`package.json` version）
2. 构建测试（本地运行 `npm run build && npm run preview`）
3. 打包测试（各平台安装包测试）
4. 发布渠道（GitHub Releases / 内部分发）

---

## 7. UI 设计规范

### 7.1 布局结构

```
┌─────────────────────────────────────────────────────────────────┐
│  SFTP Panel Header                                              │
│  [SSH 连接状态] [刷新] [新建目录] [上传] [下载]                   │
├────────────────────────────┬────────────────────────────────────┤
│                            │                                    │
│   Local File Browser       │      Remote File Browser           │
│   (本地文件)               │      (远程文件)                     │
│                            │                                    │
│   ┌──────────────────┐     │      ┌──────────────────┐          │
│   │ Path Breadcrumb  │     │      │ Path Breadcrumb  │          │
│   └──────────────────┘     │      └──────────────────┘          │
│                            │                                    │
│   ┌──────────────────┐     │      ┌──────────────────┐          │
│   │ File List        │     │      │ File List        │          │
│   │ - folder         │     │      │ - folder         │          │
│   │ - folder         │     │      │ - file           │          │
│   │ - file           │     │      │ - file           │          │
│   │ - file           │     │      │ - folder         │          │
│   └──────────────────┘     │      └──────────────────┘          │
│                            │                                    │
├────────────────────────────┴────────────────────────────────────┤
│  Transfer Queue (可折叠)                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Task 1: upload file.txt → 45% [████████░░░░░░░░░░░]      │  │
│  │ Task 2: download data.zip → 78% [████████████████░░░░]   │  │
│  │ Task 3: completed - file.log                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 组件样式

遵循现有设计系统（`src/styles/design-system.css`）：

- 使用 CSS 变量：`--color-bg-base`, `--color-bg-surface`, `--color-primary`, `--radius-md`, `--shadow-md`
- 暗色主题为主，支持亮色主题切换
- 文件列表项：hover 高亮、选中状态、右键菜单
- 传输进度条：渐变填充、百分比显示

### 7.3 交互设计

- 双击目录进入，双击文件下载
- 拖拽文件到对面面板触发传输
- 右键菜单：删除、重命名、新建目录、下载/上传
- 快捷键：Ctrl+U 上传、Ctrl+D 下载、Delete 删除

---

## 8. 用户操作手册（概要）

### 8.1 连接 SFTP

1. 在 SSH 面板连接到远程主机
2. 连接成功后，点击侧边栏 "SFTP" 图标进入文件管理面板
3. SFTP 会话自动创建，无需额外配置

### 8.2 浏览文件

- **本地文件**：左侧面板显示本地目录，点击目录进入，点击面包屑返回上级
- **远程文件**：右侧面板显示远程目录，操作同上

### 8.3 传输文件

- **上传**：选中本地文件，点击工具栏 "上传" 按钮，或拖拽到右侧面板
- **下载**：选中远程文件，点击工具栏 "下载" 按钮，或拖拽到左侧面板
- **批量传输**：选中多个文件，执行上传/下载操作

### 8.4 管理传输队列

- 底部传输队列面板显示所有任务
- 点击任务可暂停/继续/取消
- 失败任务可点击重试

### 8.5 文件操作

- 右键点击文件/目录，选择操作：删除、重命名、新建目录
- 新建目录：点击工具栏 "新建目录" 按钮

---

## 9. 附录

### 9.1 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Electron 41 + Vue 3 |
| SSH/SFTP | ssh2 (已集成) |
| 构建 | Vite + electron-vite |
| 样式 | 原生 CSS + CSS Variables |
| 状态管理 | Vue Composition API + reactive |

### 9.2 参考产品

- WinSCP - 双栏文件管理器布局
- FileZilla - 传输队列管理
- Termius - SSH + SFTP 集成
- Royal TSX - 终端 + 文件管理

### 9.3 相关文件

- 后端 SFTP API：`src/main/index.ts` (L975-L1266)
- SSH 连接管理：`src/main/index.ts` (L443-L569)
- 类型定义：`src/types/electron.d.ts`
- 预加载脚本：`src/preload/index.ts`