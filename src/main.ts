import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { GladeType } from "./GladeTypes/glade_types";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

let resultDirectory: string | null = null;

// @ts-expect-error -> squirrel is not a known module
import started from "electron-squirrel-startup";

if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 880,
    height: 750,
    resizable: false,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#4f4f75",
      height: 32,
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle(
  "find-directory",
  async (event, excludedDirectores: string[]) => {
    try {
      const directory = findLatestModifiedDirectory(excludedDirectores);
      return directory;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
);

ipcMain.handle("get-glade-screenshot", async (event, directory: string) => {
  const screenshotPath = path.join(directory, "screenshot.jpg");
  if (fs.existsSync(screenshotPath)) {
    const buffer = fs.readFileSync(screenshotPath);
    return buffer.toString("base64");
  }
  return null;
});

ipcMain.handle("set-glade-type", async (event, type: GladeType) => {
  try {
    if (!resultDirectory) {
      console.error("No directory found");
      return "Error: No directory found";
    }
    const metaPath = path.join(resultDirectory, "meta.json");
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    meta["state"]["glade"] = type;

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    return null;
  } catch (error) {
    console.error(error);
    return `Error: ${error.message}`;
  }
});

ipcMain.handle("refresh-window", async () => {
  app.relaunch();
  app.exit();
});

ipcMain.handle("request-tiny-glade-exit", async () => {
  const answer = await dialog.showMessageBox({
    type: "warning",
    title: "Attempting to close Tiny Glade",
    message: "I have to close Tiny Glade to continue. Is that okay?",
    buttons: ["Please no", "Umm... okay"],
  });

  if (answer.response === 1) {
    const exec = require("child_process").exec;
    exec("taskkill /IM tiny-glade.exe /F", (error: any) => {
      if (error) {
        console.error(error);
      }
    });
    return 1;
  }
  return 0;
});

function findLatestModifiedDirectory(excludedDirectories: string[]): string {
  const userProfile = os.homedir();
  const baseDir = path.join(userProfile, "Saved Games", "Tiny Glade", "Steam");

  if (!fs.existsSync(baseDir)) {
    throw new Error(`Directory not found: ${baseDir}`);
  }

  const userIds = fs.readdirSync(baseDir).filter((dir) => {
    const fullPath = path.join(baseDir, dir);
    return (
      fs.statSync(fullPath).isDirectory() &&
      !excludedDirectories.includes(fullPath)
    );
  });

  let latestDir = "";
  let latestTime = 0;

  for (const userId of userIds) {
    const savesDir = path.join(baseDir, userId, "saves");
    if (!fs.existsSync(savesDir)) continue;

    const subDirs = fs.readdirSync(savesDir).filter((dir) => {
      const fullPath = path.join(savesDir, dir);
      return (
        fs.statSync(fullPath).isDirectory() &&
        !excludedDirectories.includes(fullPath)
      );
    });

    for (const subDir of subDirs) {
      const fullPath = path.join(savesDir, subDir);
      const stats = fs.statSync(fullPath);
      if (stats.mtimeMs > latestTime) {
        latestTime = stats.mtimeMs;
        latestDir = fullPath;
      }
    }
  }

  if (latestDir) {
    resultDirectory = latestDir;
    return latestDir;
  } else {
    return null;
  }
}
