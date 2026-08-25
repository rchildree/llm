/**
 * Persisted UI settings. localStorage is enough: this build keeps no per-user
 * learning state, only the handful of switches on the two pages.
 *
 * The accessors are async so callers can await a batch of them at mount the
 * same way they would any other store.
 */

const PREFIX = 'iterum:'

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    // unavailable (private mode, disabled storage) or corrupt JSON
    return fallback
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // quota or unavailable storage: settings just don't persist
  }
}
