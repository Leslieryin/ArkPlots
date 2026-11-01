import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_CHANNEL } from '../src/version'
import {
  DEFAULT_DISPLAY_SETTINGS,
  loadDisplaySettings,
  saveDisplaySettings,
  SETTINGS_STORAGE_KEY,
} from '../src/settings'
import type { DisplaySettings } from '../src/settings'

/** settings.ts 只在函数体内触碰 localStorage，这里逐个测试注入内存实现。 */
function installStorage(): Map<string, string> {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  })
  return store
}

beforeEach(() => {
  installStorage()
})

describe('loadDisplaySettings', () => {
  it('returns the built-in defaults when nothing is stored', () => {
    expect(loadDisplaySettings()).toEqual(DEFAULT_DISPLAY_SETTINGS)
    expect(DEFAULT_DISPLAY_SETTINGS.updateChannel).toBe(
      APP_CHANNEL === 'preview' ? 'preview' : 'release',
    )
  })

  it('fills missing fields with defaults', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ showCover: false }))
    const loaded = loadDisplaySettings()
    expect(loaded.showCover).toBe(false)
    expect(loaded.showReason).toBe(true)
    expect(loaded.checkUpdatesOnLaunch).toBe(true)
  })

  it('falls back per field on wrong types', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ showCover: 'yes', updateChannel: 'beta', showReason: false }),
    )
    const loaded = loadDisplaySettings()
    expect(loaded.showCover).toBe(true)
    expect(loaded.showReason).toBe(false)
    expect(loaded.updateChannel).toBe(DEFAULT_DISPLAY_SETTINGS.updateChannel)
  })

  it('returns defaults for corrupt JSON', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{oops')
    expect(loadDisplaySettings()).toEqual(DEFAULT_DISPLAY_SETTINGS)
  })

  it('does not alias the defaults object', () => {
    const loaded = loadDisplaySettings()
    loaded.showCover = false
    expect(DEFAULT_DISPLAY_SETTINGS.showCover).toBe(true)
  })
})

describe('saveDisplaySettings', () => {
  it('round-trips settings through localStorage', () => {
    const settings: DisplaySettings = {
      ...DEFAULT_DISPLAY_SETTINGS,
      showCover: false,
      updateChannel: 'preview',
    }
    saveDisplaySettings(settings)
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toEqual(settings)
    expect(loadDisplaySettings()).toEqual(settings)
  })
})
