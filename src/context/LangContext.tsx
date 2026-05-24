import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { translations, type Lang, type Strings } from '../i18n'

interface LangContextValue {
  lang: Lang
  t: Strings
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  t: translations.en,
  setLang: () => {},
})

function applyDir(l: Lang) {
  document.documentElement.lang = l
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      const l: Lang = cfg.lang ?? 'en'
      setLangState(l)
      applyDir(l)
    })
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    applyDir(l)
    window.api.setConfig({ lang: l })
  }

  return (
    <LangContext.Provider value={{ lang, t: translations[lang], setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang(): LangContextValue {
  return useContext(LangContext)
}
