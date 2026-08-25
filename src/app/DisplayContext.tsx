import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { consummateVs } from '../lib/display/latinText'
import { getSetting, setSetting } from '../storage/settings'

interface DisplayState {
  /** epigraphic u/V rendering active */
  vsMode: boolean
  toggleVsMode: () => void
  /** render Latin text under the current display mode */
  lat: (s: string) => string
}

const Ctx = createContext<DisplayState>({ vsMode: false, toggleVsMode: () => {}, lat: (s) => s })

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [vsMode, setVsMode] = useState(false)

  useEffect(() => {
    getSetting('display.consummateVs', false).then(setVsMode)
  }, [])

  const toggleVsMode = useCallback(() => {
    setVsMode((v) => {
      void setSetting('display.consummateVs', !v)
      return !v
    })
  }, [])

  const lat = useCallback((s: string) => (vsMode ? consummateVs(s) : s), [vsMode])

  return <Ctx.Provider value={{ vsMode, toggleVsMode, lat }}>{children}</Ctx.Provider>
}

export const useDisplay = () => useContext(Ctx)
