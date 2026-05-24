import React, { useState, useEffect } from 'react'
import { LangProvider } from './context/LangContext'
import Sidebar, { type Page } from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Rules from './pages/Rules'
import Log from './pages/Log'
import Settings from './pages/Settings'
import styles from './App.module.css'

function AppInner() {
  const [page, setPage] = useState<Page>('dashboard')
  const [theme, setTheme] = useState<'gold' | 'blue' | 'green'>('gold')

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setTheme(cfg.theme)
      document.documentElement.setAttribute('data-theme', cfg.theme)
    })
  }, [])

  const handleThemeChange = (t: 'gold' | 'blue' | 'green') => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    window.api.setConfig({ theme: t })
  }

  return (
    <div className={styles.app}>
      <Sidebar current={page} onChange={setPage} />
      <main className={styles.main}>
        {page === 'dashboard' && <Dashboard />}
        {page === 'rules'     && <Rules />}
        {page === 'log'       && <Log />}
        {page === 'settings'  && <Settings onThemeChange={handleThemeChange} currentTheme={theme} />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  )
}
