import type { ElectronAPI, UpdateStatus } from '../electron/preload'

declare global {
  interface Window {
    api: ElectronAPI
  }
  type UpdateStatus = import('../electron/preload').UpdateStatus
}
