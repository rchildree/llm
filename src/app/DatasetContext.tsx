import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadDefaultDataset, type Dataset } from '../lib/dataset/loader'

interface DatasetState {
  dataset: Dataset | null
  error: string | null
}

const Ctx = createContext<DatasetState>({ dataset: null, error: null })

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DatasetState>({ dataset: null, error: null })

  useEffect(() => {
    let cancelled = false
    loadDefaultDataset()
      .then((dataset) => !cancelled && setState({ dataset, error: null }))
      .catch((e) => !cancelled && setState({ dataset: null, error: String(e) }))
    return () => {
      cancelled = true
    }
  }, [])

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export function useDataset(): DatasetState {
  return useContext(Ctx)
}
