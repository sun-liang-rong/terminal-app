import { app, BrowserWindow, ipcMain, Menu, safeStorage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import * as pty from 'node-pty'
import * as fs from 'fs'
import * as os from 'os'
import * as childProcess from 'child_process'
import { Client, ClientChannel } from 'ssh2'

// ESM 模块中模拟 __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface PtyCreateOptions {
  id: string
  cols?: number
  rows?: number
}

interface PtyWriteOptions {
  id: string
  data: string
}

interface PtyResizeOptions {
  id: string
  cols: number
  rows: number
}

interface PtyKillOptions {
  id: string
}

interface PtyResult {
  success: boolean
  pid?: number
  error?: string
}

let mainWindow: BrowserWindow | null = null
const ptyProcesses = new Map<string, pty.IPty>()

function createWindow(): void {
  // 计算 preload 路径 - 使用绝对路径
  const preloadPath = path.resolve(__dirname, '../preload/index.cjs')
  console.log('[Main] __dirname:', __dirname)
  console.log('[Main] Preload path:', preloadPath)
  console.log('[Main] Preload exists:', fs.existsSync(preloadPath))

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: false,
      sandbox: false,
      // 禁用沙箱以确保 preload 正确执行
      enableBlinkFeatures: ''
    }
  })

  // 移除默认菜单栏
  Menu.setApplicationMenu(null)

  // 加载 Vite 开发服务器或生产构建
  const isDev = !app.isPackaged
  if (isDev) {
    // electron-vite 会自动设置 ELECTRON_RENDERER_URL 环境变量
    const rendererUrl = process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173'
    mainWindow.loadURL(rendererUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    // 清理所有 PTY 进程
    ptyProcesses.forEach((ptyProcess) => {
      ptyProcess.kill()
    })
    ptyProcesses.clear()
    mainWindow = null
  })

  // 监听窗口最大化/还原事件，通知渲染进程
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-state-change', { maximized: true })
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-state-change', { maximized: false })
  })
}

app.whenReady().then(createWindow)

// 监听 preload 加载通知
ipcMain.on('preload-loaded', () => {
  console.log('[Main] Preload script loaded successfully!')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// 创建 PTY 进程
ipcMain.handle('pty-create', (_event, { id, cols, rows }: PtyCreateOptions): PtyResult => {
  console.log('[PTY] Creating PTY with id:', id, 'cols:', cols, 'rows:', rows)

  try {
    // 检测可用的 shell
    let shell: string

    if (process.platform === 'win32') {
      // Windows: 优先使用 PowerShell Core (pwsh)，然后是 Windows PowerShell，最后是 cmd
      const shellPaths = [
        // PowerShell Core (pwsh.exe) - 更好的颜色支持
        process.env.ProgramFiles + '\\PowerShell\\7\\pwsh.exe',
        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        process.env.ProgramFiles + '\\PowerShell\\7-x64\\pwsh.exe',
        // Windows PowerShell 5.1
        process.env.SystemRoot + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        // CMD 作为备选
        process.env.SystemRoot + '\\System32\\cmd.exe',
        'C:\\Windows\\System32\\cmd.exe'
      ]

      // 记录检测过程
      console.log('[PTY] Checking shell paths...')
      for (const p of shellPaths) {
        if (p) {
          const exists = fs.existsSync(p)
          console.log(`[PTY]   ${p}: ${exists ? 'EXISTS' : 'not found'}`)
        }
      }

      shell = shellPaths.find(p => p && fs.existsSync(p)) || 'cmd.exe'
      console.log('[PTY] Selected shell:', shell)
    } else {
      // Unix-like (macOS, Linux)
      shell = process.env.SHELL || ''
      if (!shell || !fs.existsSync(shell)) {
        const alternatives = ['/bin/zsh', '/bin/bash', '/bin/sh']
        shell = alternatives.find(s => fs.existsSync(s)) || '/bin/sh'
      }
    }

    // 根据 shell 类型设置启动参数
    let shellArgs: string[] = []
    if (process.platform === 'win32') {
      if (shell.includes('pwsh.exe')) {
        // PowerShell Core: 启用颜色，隐藏 Logo，配置 $PSStyle
        shellArgs = [
          '-NoLogo',
          '-NoExit',
          '-Command',
          '$PSStyle.OutputRendering = \"Ansi\"'
        ]
      } else if (shell.includes('powershell')) {
        // Windows PowerShell 5.1: 使用 registry 设置或启动配置
        shellArgs = ['-NoLogo', '-ExecutionPolicy', 'Bypass']
      }
      // cmd.exe 不需要特殊参数
    } else {
      // Unix-like 系统的 zsh/bash: 启动为登录 shell 以加载配置
      if (shell.includes('zsh') || shell.includes('bash')) {
        shellArgs = ['-l']  // 登录 shell，加载 .zshrc/.bashrc
      }
    }

    console.log('[PTY] Starting shell:', shell, 'with args:', shellArgs)

    // 设置环境变量以支持 ANSI 颜色
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: 'en_US.UTF-8'
    }

    // Windows 特定：强制启用 ANSI 颜色
    if (process.platform === 'win32') {
      delete env.NO_COLOR
      delete env.NO_COLOR_
      // 设置 PowerShell 颜色输出相关变量
      env.PSModulePath = process.env.PSModulePath || ''
      // 强制启用虚拟终端处理
      env.FORCE_COLOR = '1'
      env.CLICOLOR = '1'
      env.CLICOLOR_FORCE = '1'
      // 让 PowerShell 知道支持 ANSI
      env.TERM_PROGRAM = 'xterm-256color'
    }

    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME || process.cwd(),
      env,
      useConpty: process.platform === 'win32',
      handleFlowControl: true
    })

    console.log('[PTY] PTY created successfully, PID:', ptyProcess.pid)

    ptyProcesses.set(id, ptyProcess)

    // 转发 PTY 输出到渲染进程
    ptyProcess.onData((data: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty-data', { id, data })
      }
    })

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log('[PTY] Process exited, id:', id, 'exitCode:', exitCode, 'signal:', signal)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty-exit', { id, exitCode, signal })
      }
      ptyProcesses.delete(id)
    })

    return { success: true, pid: ptyProcess.pid }
  } catch (error) {
    console.error('[PTY] Failed to create PTY:', error)
    return { success: false, error: (error as Error).message }
  }
})

// 向 PTY 写入数据
ipcMain.handle('pty-write', (_event, { id, data }: PtyWriteOptions): PtyResult => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    try {
      ptyProcess.write(data)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
  return { success: false, error: 'PTY not found' }
})

// 调整 PTY 大小
ipcMain.handle('pty-resize', (_event, { id, cols, rows }: PtyResizeOptions): PtyResult => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
  return { success: false, error: 'PTY not found' }
})

// 关闭 PTY 进程
ipcMain.handle('pty-kill', (_event, { id }: PtyKillOptions): PtyResult => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    try {
      ptyProcess.kill()
      ptyProcesses.delete(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
  return { success: false, error: 'PTY not found' }
})

// 获取平台信息
ipcMain.handle('get-platform', () => process.platform)

// 获取实时 CPU 使用率
ipcMain.handle('get-cpu-usage', async (): Promise<number> => {
  return await getCpuUsage()
})

// 获取系统信息
interface SystemInfo {
  cpu: {
    model: string
    cores: number
    speed: string
    usage: number
  }
  memory: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  storage: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
}

ipcMain.handle('get-system-info', async (): Promise<SystemInfo> => {
  // CPU 信息
  const cpus = os.cpus()
  const cpuModel = cpus[0]?.model || 'Unknown'
  const cpuCores = cpus.length
  const cpuSpeed = cpus[0]?.speed ? `${(cpus[0].speed / 1000).toFixed(1)} GHz` : 'Unknown'

  // CPU 使用率
  const cpuUsage = await getCpuUsage()

  // 内存信息
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memUsagePercent = (usedMem / totalMem) * 100

  // 存储信息
  const storageInfo = await getStorageInfo()

  return {
    cpu: {
      model: cpuModel,
      cores: cpuCores,
      speed: cpuSpeed,
      usage: cpuUsage
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePercent: memUsagePercent
    },
    storage: storageInfo
  }
})

// 计算 CPU 使用率
function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const cpus1 = os.cpus()
    setTimeout(() => {
      const cpus2 = os.cpus()
      let totalDiff = 0
      let idleDiff = 0

      for (let i = 0; i < cpus1.length; i++) {
        const cpu1 = cpus1[i].times
        const cpu2 = cpus2[i].times

        const idle = cpu2.idle - cpu1.idle
        const total = (cpu2.user - cpu1.user) +
          (cpu2.nice - cpu1.nice) +
          (cpu2.sys - cpu1.sys) +
          (cpu2.irq - cpu1.irq) +
          idle

        totalDiff += total
        idleDiff += idle
      }

      const usage = totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0
      resolve(Math.round(usage * 10) / 10)
    }, 100)
  })
}

// 获取存储信息
function getStorageInfo(): Promise<{ total: number; used: number; free: number; usagePercent: number }> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      childProcess.exec('wmic logicaldisk get size,freespace,caption', (error, stdout) => {
        if (error) {
          resolve({ total: 0, used: 0, free: 0, usagePercent: 0 })
          return
        }

        const lines = stdout.trim().split('\n').slice(1)
        let total = 0
        let free = 0

        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 3) {
            const freeSpace = parseInt(parts[0]) || 0
            const size = parseInt(parts[1]) || 0
            total += size
            free += freeSpace
          }
        }

        const used = total - free
        const usagePercent = total > 0 ? (used / total) * 100 : 0

        resolve({
          total,
          used,
          free,
          usagePercent
        })
      })
    } else {
      // macOS/Linux
      childProcess.exec('df -k /', (error, stdout) => {
        if (error) {
          resolve({ total: 0, used: 0, free: 0, usagePercent: 0 })
          return
        }

        const lines = stdout.trim().split('\n')
        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/)
          const total = parseInt(parts[1]) * 1024
          const used = parseInt(parts[2]) * 1024
          const free = parseInt(parts[3]) * 1024
          const usagePercent = total > 0 ? (used / total) * 100 : 0

          resolve({ total, used, free, usagePercent })
        } else {
          resolve({ total: 0, used: 0, free: 0, usagePercent: 0 })
        }
      })
    }
  })
}

// ===================== SSH 连接相关 =====================

interface SshConfig {
  id?: string
  host: string
  port: number
  username: string
  password: string
}

interface SshResult {
  success: boolean
  id?: string
  error?: string
}

// SSH 连接存储
const sshConnections = new Map<string, { client: Client; stream: ClientChannel }>()

// SSH 连接
ipcMain.handle('ssh-connect', async (_event, config: SshConfig): Promise<SshResult> => {
  const id = config.id || `ssh-${Date.now()}`
  const client = new Client()

  return new Promise((resolve) => {
    client.on('ready', () => {
      // 创建 shell - 设置终端类型为 xterm-256color 以支持丰富颜色
      client.shell({
        term: 'xterm-256color',
        cols: 80,
        rows: 24
      }, (err, stream) => {
        if (err) {
          client.end()
          resolve({ success: false, error: err.message })
          return
        }

        sshConnections.set(id, { client, stream })

        // 接收数据
        stream.on('data', (data: Buffer) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ssh-data', { id, data: data.toString() })
          }
        })

        // 关闭
        stream.on('close', () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ssh-close', { id })
          }
          sshConnections.delete(id)
          client.end()
        })

        // 错误输出也要处理
        stream.stderr.on('data', (data: Buffer) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ssh-data', { id, data: data.toString() })
          }
        })

        resolve({ success: true, id })
      })
    })

    client.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })

    // 连接配置
    client.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 10000
    })
  })
})

// SSH 写入数据
ipcMain.handle('ssh-write', (_event, { id, data }: { id: string; data: string }): SshResult => {
  const conn = sshConnections.get(id)
  if (conn && conn.stream) {
    try {
      conn.stream.write(data)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
  return { success: false, error: 'SSH connection not found' }
})

// SSH 调整大小
ipcMain.handle('ssh-resize', (_event, { id, cols, rows }: { id: string; cols: number; rows: number }): SshResult => {
  const conn = sshConnections.get(id)
  if (conn && conn.stream) {
    try {
      conn.stream.setWindow(rows, cols, 0, 0)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
  return { success: false, error: 'SSH connection not found' }
})

// SSH 断开连接
ipcMain.handle('ssh-disconnect', (_event, { id }: { id: string }): SshResult => {
  const conn = sshConnections.get(id)
  if (conn) {
    try {
      conn.stream.end()
      conn.client.end()
      sshConnections.delete(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
  return { success: false, error: 'SSH connection not found' }
})

// ===================== 数据存储相关 =====================

// 存储文件路径
const getStoragePath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'ssh-hosts.json')
}

const getAIStoragePath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'ai-settings.json')
}

const getTerminalSettingsPath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'terminal-settings.json')
}

const getAIChatHistoryPath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'ai-chat-history.json')
}

// 密码加密
ipcMain.handle('encrypt-password', (_event, password: string) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      // 如果加密不可用，使用 base64 编码作为后备方案
      return { success: true, data: Buffer.from(password).toString('base64') }
    }
    const encrypted = safeStorage.encryptString(password)
    return { success: true, data: encrypted.toString('base64') }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 密码解密
ipcMain.handle('decrypt-password', (_event, encrypted: string) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      // 如果加密不可用，使用 base64 解码作为后备方案
      return { success: true, data: Buffer.from(encrypted, 'base64').toString() }
    }
    const buffer = Buffer.from(encrypted, 'base64')
    const decrypted = safeStorage.decryptString(buffer)
    return { success: true, data: decrypted }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 获取主机列表
ipcMain.handle('get-hosts', () => {
  try {
    const storagePath = getStoragePath()
    if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf-8')
      return { success: true, data: JSON.parse(data) }
    }
    return { success: true, data: [] }
  } catch (error) {
    return { success: false, error: (error as Error).message, data: [] }
  }
})

// 保存主机列表
ipcMain.handle('save-hosts', (_event, hosts: unknown[]) => {
  try {
    const storagePath = getStoragePath()
    fs.writeFileSync(storagePath, JSON.stringify(hosts, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 获取 AI 设置
ipcMain.handle('get-ai-settings', () => {
  try {
    const storagePath = getAIStoragePath()
    if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf-8')
      return { success: true, data: JSON.parse(data) }
    }
    return { success: true, data: null }
  } catch (error) {
    return { success: false, error: (error as Error).message, data: null }
  }
})

// 保存 AI 设置
ipcMain.handle('save-ai-settings', (_event, settings: unknown) => {
  try {
    const storagePath = getAIStoragePath()
    fs.writeFileSync(storagePath, JSON.stringify(settings, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 获取终端设置
ipcMain.handle('get-terminal-settings', () => {
  try {
    const storagePath = getTerminalSettingsPath()
    if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf-8')
      return { success: true, data: JSON.parse(data) }
    }
    return { success: true, data: null }
  } catch (error) {
    return { success: false, error: (error as Error).message, data: null }
  }
})

// 保存终端设置
ipcMain.handle('save-terminal-settings', (_event, settings: unknown) => {
  try {
    const storagePath = getTerminalSettingsPath()
    fs.writeFileSync(storagePath, JSON.stringify(settings, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// ===================== AI 聊天记录持久化 =====================

// 获取 AI 聊天记录
ipcMain.handle('get-ai-chat-history', () => {
  try {
    const storagePath = getAIChatHistoryPath()
    if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf-8')
      return { success: true, data: JSON.parse(data) }
    }
    return { success: true, data: [] }
  } catch (error) {
    return { success: false, error: (error as Error).message, data: [] }
  }
})

// 保存 AI 聊天记录
ipcMain.handle('save-ai-chat-history', (_event, messages: unknown[]) => {
  try {
    const storagePath = getAIChatHistoryPath()
    fs.writeFileSync(storagePath, JSON.stringify(messages, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 清空 AI 聊天记录
ipcMain.handle('clear-ai-chat-history', () => {
  try {
    const storagePath = getAIChatHistoryPath()
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// ===================== 窗口控制相关 =====================

// 最小化窗口
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize()
    return { success: true }
  }
  return { success: false, error: 'Window not found' }
})

// 最大化/还原窗口
ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
    return { success: true }
  }
  return { success: false, error: 'Window not found' }
})

// 关闭窗口
ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close()
    return { success: true }
  }
  return { success: false, error: 'Window not found' }
})

// 获取窗口是否最大化
ipcMain.handle('is-maximized', () => {
  if (mainWindow) {
    return mainWindow.isMaximized()
  }
  return false
})

// ===================== AI API 代理 =====================

interface AIChatRequest {
  provider: string
  apiKey?: string
  baseUrl?: string
  model: string
  messages: Array<{ role: string; content: string }>
}

// 存储活跃的流读取器
const activeStreams = new Map<string, ReadableStreamDefaultReader<Uint8Array>>()

// AI 流式聊天请求代理
ipcMain.handle('ai-chat-stream', async (_event, request: AIChatRequest) => {
  try {
    const { provider, apiKey, baseUrl, model, messages } = request

    console.log('[AI Chat] Request:', { provider, model, baseUrl, hasApiKey: !!apiKey })

    let url: string
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    let body: any

    switch (provider) {
      case 'openai':
        url = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`
        headers['Authorization'] = `Bearer ${apiKey}`
        body = {
          model,
          messages,
          stream: true
        }
        break

      case 'claude':
        url = `${(baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '')}/messages`
        headers['x-api-key'] = apiKey || ''
        headers['anthropic-version'] = '2023-06-01'

        // Claude 要求消息严格交替 user/assistant
        const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []
        let lastRole: string | null = null

        for (const m of messages) {
          if (m.role === 'system') continue // system 单独处理
          const role = m.role === 'assistant' ? 'assistant' : 'user'
          if (role === lastRole) {
            // 合并相同角色的消息
            const lastMsg = claudeMessages[claudeMessages.length - 1]
            if (lastMsg) {
              lastMsg.content += '\n\n' + m.content
            }
          } else {
            claudeMessages.push({ role, content: m.content })
            lastRole = role
          }
        }

        body = {
          model,
          max_tokens: 4096,
          messages: claudeMessages,
          system: messages.find(m => m.role === 'system')?.content || 'You are a helpful assistant.',
          stream: true
        }
        break

      case 'ollama':
        url = `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/chat`
        body = {
          model,
          messages,
          stream: true
        }
        break

      case 'custom':
        url = `${(baseUrl || '').replace(/\/$/, '')}/chat/completions`
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`
        }
        body = {
          model,
          messages,
          stream: true
        }
        break

      default:
        return { success: false, error: `不支持的提供商: ${provider}` }
    }

    console.log('[AI Chat] Sending request to:', url)
    console.log('[AI Chat] Model:', body.model)

    // 创建超时控制器 - 60秒超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    })

    // 请求成功后清除超时
    clearTimeout(timeoutId)

    console.log('[AI Chat] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorJson.message || errorText
      } catch {
        errorMessage = errorText || errorMessage
      }
      return { success: false, error: errorMessage }
    }

    // 返回流数据
    const reader = response.body?.getReader()
    if (!reader) {
      return { success: false, error: '无法读取响应流' }
    }

    // 创建一个 ID 用于标识这次流
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    activeStreams.set(streamId, reader)

    // 开始读取流
    const readStream = async () => {
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('ai-stream-data', { streamId, done: true })
            }
            activeStreams.delete(streamId)
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-stream-data', { streamId, data: chunk })
          }
        }
      } catch (error) {
        console.error('[AI Stream] Error reading stream:', error)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ai-stream-data', {
            streamId,
            error: error instanceof Error ? error.message : '读取流失败'
          })
        }
        activeStreams.delete(streamId)
      }
    }

    // 启动读取
    readStream()

    return { success: true, streamId }
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    // 处理超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: '请求超时（60秒），请检查网络连接或模型服务状态' }
    }
    return { success: false, error: error instanceof Error ? error.message : '请求失败' }
  }
})

// 中止 AI 流
ipcMain.handle('ai-abort-stream', (_event, streamId: string) => {
  const reader = activeStreams.get(streamId)
  if (reader) {
    try {
      reader.cancel()
      activeStreams.delete(streamId)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
  return { success: true }
})