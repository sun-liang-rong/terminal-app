import { app, BrowserWindow, ipcMain, Menu } from 'electron'
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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
      webSecurity: false,
      sandbox: false
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
}

app.whenReady().then(createWindow)

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
      shell = shellPaths.find(p => p && fs.existsSync(p)) || 'cmd.exe'
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
        // PowerShell Core: 启用颜色，隐藏 Logo
        shellArgs = ['-NoLogo', '-WorkingDirectory', process.env.HOME || process.cwd()]
      } else if (shell.includes('powershell')) {
        // Windows PowerShell 5.1
        shellArgs = ['-NoLogo']
      }
      // cmd.exe 不需要特殊参数
    } else {
      // Unix-like 系统的 zsh/bash: 启动为登录 shell 以加载配置
      if (shell.includes('zsh') || shell.includes('bash')) {
        shellArgs = ['-l']  // 登录 shell，加载 .zshrc/.bashrc
      }
    }

    console.log('Starting shell:', shell, 'with args:', shellArgs)

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

    ptyProcesses.set(id, ptyProcess)

    // 转发 PTY 输出到渲染进程
    ptyProcess.onData((data: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty-data', { id, data })
      }
    })

    ptyProcess.onExit(({ exitCode, signal }) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty-exit', { id, exitCode, signal })
      }
      ptyProcesses.delete(id)
    })

    return { success: true, pid: ptyProcess.pid }
  } catch (error) {
    console.error('Failed to create PTY:', error)
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
      conn.stream.setWindow(rows, cols)
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