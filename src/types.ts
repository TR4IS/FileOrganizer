// Re-export all types for the renderer — never import from electron/ in src/
export type {
  Rule,
  AppConfig,
  OrganizeResult,
  Stats,
  ActivityEntry,
} from '../electron/types'

declare const __APP_VERSION__: string
export { __APP_VERSION__ }
