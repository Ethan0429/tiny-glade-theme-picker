import { contextBridge, ipcRenderer } from "electron";
import { GladeType } from "./GladeTypes/glade_types";

contextBridge.exposeInMainWorld("electronAPI", {
  findDirectory: (excludedDirectories: string[]) =>
    ipcRenderer.invoke("find-directory", excludedDirectories),
  getGladeScreenshot: (directory: string) =>
    ipcRenderer.invoke("get-glade-screenshot", directory),
  setGladeType: (type: GladeType) => ipcRenderer.invoke("set-glade-type", type),
  refreshWindow: () => ipcRenderer.invoke("refresh-window"),
  requestTinyGladeExit: () => ipcRenderer.invoke("request-tiny-glade-exit"),
});
