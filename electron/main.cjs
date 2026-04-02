const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const pty = require('node-pty')

let mainWindow
const ptyProcesses = new Map()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
      sandbox: false
    }
  })

  // 加载 Vite 开发服务器或生产构建
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
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
ipcMain.handle('pty-create', (event, { id, cols, rows }) => {
  try {
    // 检测可用的 shell
    let shell = process.env.SHELL
    if (!shell) {
      if (process.platform === 'darwin') {
        shell = '/bin/zsh'
      } else if (process.platform === 'linux') {
        shell = '/bin/bash'
      } else {
        shell = 'powershell.exe'
      }
    }

    // 检查 shell 是否存在
    const fs = require('fs')
    if (!fs.existsSync(shell)) {
      // 尝试备用 shell
      const alternatives = ['/bin/bash', '/bin/zsh', '/bin/sh']
      shell = alternatives.find(s => fs.existsSync(s)) || '/bin/sh'
    }

    console.log('Starting shell:', shell)

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME || process.cwd(),
      env: process.env,
      useConpty: false,
      handleFlowControl: true
    })

    ptyProcesses.set(id, ptyProcess)

    // 转发 PTY 输出到渲染进程
    ptyProcess.onData((data) => {
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
    return { success: false, error: error.message }
  }
})

// 向 PTY 写入数据
ipcMain.handle('pty-write', (event, { id, data }) => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    try {
      ptyProcess.write(data)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  return { success: false, error: 'PTY not found' }
})

// 调整 PTY 大小
ipcMain.handle('pty-resize', (event, { id, cols, rows }) => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  return { success: false, error: 'PTY not found' }
})

// 关闭 PTY 进程
ipcMain.handle('pty-kill', (event, { id }) => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    try {
      ptyProcess.kill()
      ptyProcesses.delete(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  return { success: false, error: 'PTY not found' }
})

// 获取平台信息
ipcMain.handle('get-platform', () => process.platform)
