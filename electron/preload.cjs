const { contextBridge, ipcRenderer } = require('electron')

// 存储每个终端的监听器
const listeners = new Map()

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // PTY 相关
  ptyCreate: (options) => ipcRenderer.invoke('pty-create', options),
  ptyWrite: (options) => ipcRenderer.invoke('pty-write', options),
  ptyResize: (options) => ipcRenderer.invoke('pty-resize', options),
  ptyKill: (options) => ipcRenderer.invoke('pty-kill', options),

  // 监听 PTY 输出 - 每个终端独立监听
  onPtyData: (callback) => {
    const handler = (event, data) => callback(data)
    ipcRenderer.on('pty-data', handler)
    const id = Date.now()
    listeners.set(id, { type: 'data', handler })
    return id
  },

  onPtyExit: (callback) => {
    const handler = (event, data) => callback(data)
    ipcRenderer.on('pty-exit', handler)
    const id = Date.now() + 1
    listeners.set(id, { type: 'exit', handler })
    return id
  },

  // 移除特定终端的监听器
  removePtyListeners: () => {
    listeners.forEach(({ type, handler }) => {
      ipcRenderer.removeListener(type === 'data' ? 'pty-data' : 'pty-exit', handler)
    })
    listeners.clear()
  },

  // 平台信息
  getPlatform: () => ipcRenderer.invoke('get-platform')
})