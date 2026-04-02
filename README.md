# Terminal MVP

一个基于 Electron + Vue + xterm.js 的桌面端终端应用。

## 已实现功能

- ✅ 多标签页 (Tabs) - 支持新建、切换、关闭标签
- ✅ 终端模拟 - 基于 xterm.js 的完整终端模拟
- ✅ 主题切换 - 支持暗色/亮色主题
- ✅ 快捷键 - 基础快捷键支持
- ✅ 链接识别 - 自动识别 URL 链接
- ✅ 响应式布局 - 自适应窗口大小

## 技术栈

- **框架**: Electron 41 + Vue 3
- **终端模拟**: xterm.js 6.0
- **构建工具**: Vite + electron-vite
- **样式**: 原生 CSS

## 快速开始

### 安装依赖

```bash
npm install --legacy-peer-deps
```

### 开发模式运行

```bash
npm run electron:dev
```

### 构建生产版本

```bash
npm run electron:build
```

### 打包应用

```bash
npm run dist
```

### 运行测试验证

```bash
node test.cjs
```

## 终端命令

终端支持以下模拟命令：

- `help` - 显示帮助信息
- `clear` - 清空终端
- `date` - 显示当前日期时间
- `echo <message>` - 输出消息
- `whoami` - 显示当前用户
- `exit` - 退出终端

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 执行命令 |
| `Backspace` | 删除字符 |
| `Ctrl+C` | 中断当前操作 |

## 项目结构

```
terminal-app/
├── electron/
│   ├── main.cjs          # Electron 主进程
│   └── preload.cjs       # 预加载脚本
├── src/
│   ├── components/
│   │   ├── Terminal.vue    # 终端组件
│   │   ├── Tabs.vue        # 标签页组件
│   │   ├── ThemeToggle.vue # 主题切换组件
│   │   └── Toolbar.vue     # 工具栏组件
│   ├── App.vue
│   └── main.js
├── dist/                 # 前端构建输出
├── dist-electron/        # Electron 构建输出
├── vite.config.js
├── electron.vite.config.js
├── test.cjs              # 验证测试脚本
└── package.json
```

## 验证测试结果

✅ **18 项测试全部通过**

- ✅ Electron 主进程配置正确
- ✅ Electron 预加载脚本配置正确
- ✅ Vue 组件完整性检查
- ✅ xterm.js 正确导入
- ✅ 终端命令处理逻辑
- ✅ 多标签功能实现
- ✅ 主题切换功能实现
- ✅ 构建输出完整性
- ✅ **Electron 开发模式运行成功** (http://localhost:5173)

## 后续计划

- [ ] 集成 node-pty 实现真实的 Shell 交互
- [ ] 分屏功能
- [ ] SSH 客户端
- [ ] 会话恢复
- [ ] 文件浏览器
- [ ] 搜索功能
- [ ] 更多快捷键支持

## License

MIT
