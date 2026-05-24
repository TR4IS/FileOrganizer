import chokidar, { FSWatcher } from 'chokidar'

export class DirectoryWatcher {
  private watcher: FSWatcher | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private trigger: () => void,
    private debounceMs = 2000,
  ) {}

  start(targetPath: string): void {
    if (this.watcher) return

    this.watcher = chokidar.watch(targetPath, {
      depth: 0,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
    })

    this.watcher.on('add', () => this.scheduleRun())
    this.watcher.on('change', () => this.scheduleRun())
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  restart(targetPath: string): void {
    this.stop()
    this.start(targetPath)
  }

  isRunning(): boolean {
    return this.watcher !== null
  }

  setDebounce(ms: number): void {
    this.debounceMs = ms
  }

  private scheduleRun(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.trigger()
    }, this.debounceMs)
  }
}
