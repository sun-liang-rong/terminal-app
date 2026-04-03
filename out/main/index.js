import { app, ipcMain, BrowserWindow } from "electron";
import path from "path";
import * as pty from "node-pty";
import * as fs from "fs";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
let mainWindow = null;
const ptyProcesses = /* @__PURE__ */ new Map();
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/index.mjs"),
      webSecurity: false,
      sandbox: false
    }
  });
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.on("closed", () => {
    ptyProcesses.forEach((ptyProcess) => {
      ptyProcess.kill();
    });
    ptyProcesses.clear();
    mainWindow = null;
  });
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
ipcMain.handle("pty-create", (_event, { id, cols, rows }) => {
  try {
    let shell;
    if (process.platform === "win32") {
      const powershellPaths = [
        process.env.SystemRoot + "\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
      ];
      shell = powershellPaths.find((p) => fs.existsSync(p)) || "";
      if (!shell) {
        const cmdPath = process.env.SystemRoot + "\\System32\\cmd.exe";
        shell = fs.existsSync(cmdPath) ? cmdPath : "cmd.exe";
      }
    } else {
      shell = process.env.SHELL || "";
      if (!shell || !fs.existsSync(shell)) {
        const alternatives = ["/bin/zsh", "/bin/bash", "/bin/sh"];
        shell = alternatives.find((s) => fs.existsSync(s)) || "/bin/sh";
      }
    }
    console.log("Starting shell:", shell);
    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME || process.cwd(),
      env: process.env,
      useConpty: process.platform === "win32",
      handleFlowControl: true
    });
    ptyProcesses.set(id, ptyProcess);
    ptyProcess.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("pty-data", { id, data });
      }
    });
    ptyProcess.onExit(({ exitCode, signal }) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("pty-exit", { id, exitCode, signal });
      }
      ptyProcesses.delete(id);
    });
    return { success: true, pid: ptyProcess.pid };
  } catch (error) {
    console.error("Failed to create PTY:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("pty-write", (_event, { id, data }) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    try {
      ptyProcess.write(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "PTY not found" };
});
ipcMain.handle("pty-resize", (_event, { id, cols, rows }) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "PTY not found" };
});
ipcMain.handle("pty-kill", (_event, { id }) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    try {
      ptyProcess.kill();
      ptyProcesses.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "PTY not found" };
});
ipcMain.handle("get-platform", () => process.platform);
