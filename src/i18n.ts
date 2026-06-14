export type Lang = 'en' | 'ar'

export interface Strings {
  // Sidebar nav
  navDash: string
  navRules: string
  navLog: string
  navSet: string
  // Dashboard
  dashTitle: string
  filesToday: string
  allTime: string
  watchingLabel: string
  idle: string
  active: string
  stoppedStatus: string
  notRunYet: string
  lastRun: (m: number) => string
  justNow: string
  // Update status
  updateAvailable: (v: string) => string
  updateNotAvailable: string
  updateDownloading: (pct: number) => string
  updateDownloaded: string
  updateError: (msg: string) => string
  changeFolder: string
  noFolderSelected: string
  categoryToday: string
  recentActivity: string
  noFilesToday: string
  noActivity: string
  organizeNow: string
  running: string
  watch: string
  stop: string
  allTimeCount: (n: string) => string
  // Rules
  rulesTitle: string
  rulesSubtitle: string
  extension: string
  destFolder: string
  resetToPreset: string
  addRule: string
  extPlaceholder: string
  folderPlaceholder: string
  resetConfirm: (p: string) => string
  // Rules — new
  extensionsSectionLabel: string
  prefixesSectionLabel: string
  folderNamesSectionLabel: string
  addExtension: string
  addPrefix: string
  addFolderName: string
  newDestFolder: string
  newDestFolderPlaceholder: string
  deleteGroupConfirm: (folder: string) => string
  // Settings — new
  moveUnmatchedFolders: string
  unmatchedFolderDest: string
  // Log
  logTitle: string
  entries: (n: number) => string
  clearLog: string
  clearLogConfirm: string
  noLogEntries: string
  // Settings
  settingsTitle: string
  sectionFolder: string
  targetFolder: string
  change: string
  sectionAppearance: string
  theme: string
  themeGold: string
  themeBlue: string
  themeGreen: string
  sectionBehavior: string
  launchAtStartup: string
  autoStartWatcher: string
  watcherDebounce: string
  seconds: string
  sectionUpdates: string
  autoCheckUpdates: string
  currentVersion: string
  checkForUpdates: string
  sectionAbout: string
  builtBy: string
  license: string
  sectionLanguage: string
  langEnglish: string
  langArabic: string
}

const en: Strings = {
  navDash: 'DASH',
  navRules: 'RULES',
  navLog: 'LOG',
  navSet: 'SET',

  dashTitle: 'Dashboard',
  filesToday: 'Files Today',
  allTime: 'All Time',
  watchingLabel: 'Watching',
  idle: 'Idle',
  active: '● Active',
  stoppedStatus: '○ Stopped',
  notRunYet: 'Not run yet',
  lastRun: (m) => `Last run ${m} min ago`,
  justNow: 'Just now',
  updateAvailable: (v) => `v${v} available — downloading…`,
  updateNotAvailable: 'Already up to date',
  updateDownloading: (pct) => `Downloading… ${pct}%`,
  updateDownloaded: 'Downloaded — will install on exit',
  updateError: (msg) => `Error: ${msg}`,
  changeFolder: 'Change Folder',
  noFolderSelected: 'No folder selected',
  categoryToday: 'Category Breakdown — Today',
  recentActivity: 'Recent Activity',
  noFilesToday: 'No files organized today',
  noActivity: 'No recent activity',
  organizeNow: 'Organize Now',
  running: 'Running…',
  watch: 'Watch',
  stop: 'Stop',
  allTimeCount: (n) => `${n} all time`,

  rulesTitle: 'Rules',
  rulesSubtitle: 'Map files and folders to destinations',
  extension: 'Extension',
  destFolder: 'Destination Folder',
  resetToPreset: 'Reset to Preset',
  addRule: '+ Add',
  extPlaceholder: '.ext',
  folderPlaceholder: 'folder-name',
  resetConfirm: (p) => `Reset to "${p}" preset? This will replace all current rules.`,
  extensionsSectionLabel: 'Extensions',
  prefixesSectionLabel: 'Filename Starts With',
  folderNamesSectionLabel: 'Subfolders Named',
  addExtension: '+ add extension',
  addPrefix: '+ add prefix',
  addFolderName: '+ add folder',
  newDestFolder: '+ New Destination Folder',
  newDestFolderPlaceholder: 'folder-name',
  deleteGroupConfirm: (folder) => `Delete "${folder}" and all its rules?`,
  moveUnmatchedFolders: 'Move unmatched folders',
  unmatchedFolderDest: 'Destination folder',

  logTitle: 'Log',
  entries: (n) => `${n} entries`,
  clearLog: 'Clear Log',
  clearLogConfirm: 'Clear all log entries?',
  noLogEntries: 'No log entries yet. Run an organize to see activity.',

  settingsTitle: 'Settings',
  sectionFolder: 'Folder',
  targetFolder: 'Target folder',
  change: 'Change',
  sectionAppearance: 'Appearance',
  theme: 'Theme',
  themeGold: 'Gold',
  themeBlue: 'Electric Blue',
  themeGreen: 'Emerald Green',
  sectionBehavior: 'Behavior',
  launchAtStartup: 'Launch at system startup',
  autoStartWatcher: 'Auto-start watcher on launch',
  watcherDebounce: 'Watcher debounce',
  seconds: 'seconds',
  sectionUpdates: 'Updates',
  autoCheckUpdates: 'Auto-check for updates on startup',
  currentVersion: 'Current version',
  checkForUpdates: 'Check for Updates',
  sectionAbout: 'About',
  builtBy: 'Built by',
  license: 'MIT License',
  sectionLanguage: 'Language',
  langEnglish: 'English',
  langArabic: 'Arabic',
}

const ar: Strings = {
  navDash: 'رئيسي',
  navRules: 'قواعد',
  navLog: 'سجل',
  navSet: 'ضبط',

  dashTitle: 'الرئيسية',
  filesToday: 'ملفات اليوم',
  allTime: 'الإجمالي',
  watchingLabel: 'قيد المراقبة',
  idle: 'متوقف',
  active: '● نشط',
  stoppedStatus: '○ متوقف',
  notRunYet: 'لم يعمل بعد',
  lastRun: (m) => `آخر تشغيل منذ ${m} دقيقة`,
  justNow: 'الآن',
  updateAvailable: (v) => `الإصدار ${v} متاح — جارٍ التنزيل…`,
  updateNotAvailable: 'أنت تستخدم أحدث إصدار',
  updateDownloading: (pct) => `جارٍ التنزيل… ${pct}%`,
  updateDownloaded: 'تم التنزيل — سيتم التثبيت عند الإغلاق',
  updateError: (msg) => `خطأ: ${msg}`,
  changeFolder: 'تغيير المجلد',
  noFolderSelected: 'لم يتم تحديد مجلد',
  categoryToday: 'تصنيف ملفات اليوم',
  recentActivity: 'النشاط الأخير',
  noFilesToday: 'لا ملفات منظمة اليوم',
  noActivity: 'لا نشاط أخير',
  organizeNow: 'رتّب الآن',
  running: 'جارٍ…',
  watch: 'مراقبة',
  stop: 'إيقاف',
  allTimeCount: (n) => `${n} إجمالاً`,

  rulesTitle: 'القواعد',
  rulesSubtitle: 'ربط الملفات والمجلدات بمجلدات الوجهة',
  extension: 'الامتداد',
  destFolder: 'مجلد الوجهة',
  resetToPreset: 'إعادة الضبط',
  addRule: '+ إضافة',
  extPlaceholder: '.امتداد',
  folderPlaceholder: 'اسم-المجلد',
  resetConfirm: (p) => `إعادة الضبط إلى "${p}"؟ سيستبدل جميع القواعد الحالية.`,
  extensionsSectionLabel: 'الامتدادات',
  prefixesSectionLabel: 'اسم الملف يبدأ بـ',
  folderNamesSectionLabel: 'المجلدات المسماة',
  addExtension: '+ إضافة امتداد',
  addPrefix: '+ إضافة بادئة',
  addFolderName: '+ إضافة مجلد',
  newDestFolder: '+ مجلد وجهة جديد',
  newDestFolderPlaceholder: 'اسم-المجلد',
  deleteGroupConfirm: (folder) => `حذف "${folder}" وجميع قواعده؟`,
  moveUnmatchedFolders: 'نقل المجلدات غير المطابقة',
  unmatchedFolderDest: 'مجلد الوجهة',

  logTitle: 'السجل',
  entries: (n) => `${n} إدخال`,
  clearLog: 'مسح السجل',
  clearLogConfirm: 'مسح جميع إدخالات السجل؟',
  noLogEntries: 'لا توجد إدخالات في السجل بعد. قم بتشغيل التنظيم لرؤية النشاط.',

  settingsTitle: 'الإعدادات',
  sectionFolder: 'المجلد',
  targetFolder: 'المجلد المستهدف',
  change: 'تغيير',
  sectionAppearance: 'المظهر',
  theme: 'السمة',
  themeGold: 'ذهبي',
  themeBlue: 'أزرق كهربائي',
  themeGreen: 'أخضر زمردي',
  sectionBehavior: 'السلوك',
  launchAtStartup: 'التشغيل عند بدء النظام',
  autoStartWatcher: 'بدء المراقبة تلقائياً عند التشغيل',
  watcherDebounce: 'تأخير المراقب',
  seconds: 'ثانية',
  sectionUpdates: 'التحديثات',
  autoCheckUpdates: 'التحقق التلقائي من التحديثات',
  currentVersion: 'الإصدار الحالي',
  checkForUpdates: 'البحث عن تحديثات',
  sectionAbout: 'حول التطبيق',
  builtBy: 'تطوير',
  license: 'رخصة MIT',
  sectionLanguage: 'اللغة',
  langEnglish: 'الإنجليزية',
  langArabic: 'العربية',
}

export const translations: Record<Lang, Strings> = { en, ar }
