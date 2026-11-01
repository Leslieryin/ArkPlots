import { describe, expect, it } from 'vitest'

import {
  extractPreplotId,
  extractPreplotReason,
  normalizeList,
  parseVideos,
  READ_STATUSES,
} from '../src/types'
import type { PlotItem } from '../src/types'

const itemWith = (videos: PlotItem['Videos']): PlotItem => ({ id: 1, videos })

describe('normalizeList', () => {
  it('returns an empty array for nullish input', () => {
    expect(normalizeList(null)).toEqual([])
    expect(normalizeList(undefined)).toEqual([])
  })

  it('wraps a scalar into a one-element list', () => {
    expect(normalizeList('炎')).toEqual(['炎'])
    expect(normalizeList(12)).toEqual(['12'])
  })

  it('maps array entries to strings and drops null entries', () => {
    expect(normalizeList(['a', 2, null, undefined, 'b'])).toEqual(['a', '2', 'b'])
    expect(normalizeList([])).toEqual([])
  })
})

describe('extractPreplotId', () => {
  it('accepts scalar ids and rejects empty strings', () => {
    expect(extractPreplotId(5)).toBe('5')
    expect(extractPreplotId('main-1')).toBe('main-1')
    expect(extractPreplotId('')).toBeNull()
  })

  it('reads the first present id-like field of an object', () => {
    expect(extractPreplotId({ id: 7 })).toBe('7')
    expect(extractPreplotId({ pid: '8' })).toBe('8')
    expect(extractPreplotId({ plot_id: 9 })).toBe('9')
    expect(extractPreplotId({ ID: 10 })).toBe('10')
    expect(extractPreplotId({ Id: 11 })).toBe('11')
    expect(extractPreplotId({ id: 1, pid: 2 })).toBe('1')
  })

  it('returns null for objects without an id and for nullish entries', () => {
    expect(extractPreplotId({})).toBeNull()
    expect(extractPreplotId({ reason: '先看主线' })).toBeNull()
    expect(extractPreplotId({ id: '' })).toBeNull()
    expect(extractPreplotId(null)).toBeNull()
    expect(extractPreplotId(undefined)).toBeNull()
  })
})

describe('extractPreplotReason', () => {
  it('returns an empty string for scalar refs', () => {
    expect(extractPreplotReason(5)).toBe('')
    expect(extractPreplotReason('main-1')).toBe('')
  })

  it('prefers reason_en only for non zh-CN locales', () => {
    const entry = { reason: '补主线', reason_en: 'Read main first' }
    expect(extractPreplotReason(entry, 'en-US')).toBe('Read main first')
    expect(extractPreplotReason(entry, 'zh-CN')).toBe('补主线')
    expect(extractPreplotReason(entry)).toBe('补主线')
  })

  it('falls back to reason when reason_en is blank', () => {
    const entry = { reason: '补主线', reason_en: '   ' }
    expect(extractPreplotReason(entry, 'en-US')).toBe('补主线')
  })

  it('returns an empty string when no reason field exists', () => {
    expect(extractPreplotReason({ id: 3 }, 'en-US')).toBe('')
  })
})

describe('parseVideos', () => {
  it('returns an empty list when no video field is set', () => {
    expect(parseVideos({ id: 1 })).toEqual([])
    expect(parseVideos(itemWith(undefined))).toEqual([])
  })

  it('supports a bare URL string', () => {
    expect(parseVideos(itemWith('https://a/1'))).toEqual([
      { name: 'https://a/1', url: 'https://a/1' },
    ])
  })

  it('reads a name -> url record', () => {
    expect(parseVideos(itemWith({ PV1: 'https://a/1', PV2: 'https://a/2' }))).toEqual([
      { name: 'PV1', url: 'https://a/1' },
      { name: 'PV2', url: 'https://a/2' },
    ])
  })

  it('reads arrays of URLs and objects, skipping entries without a url', () => {
    expect(parseVideos(itemWith(['https://a/1']))).toEqual([{ name: 'https://a/1', url: 'https://a/1' }])
    expect(
      parseVideos(itemWith([{ title: 'PV', link: 'https://a/1' }, { name: 'X' }])),
    ).toEqual([{ name: 'PV', url: 'https://a/1' }])
  })

  it('prefers Videos over videos over Video', () => {
    expect(parseVideos({ id: 1, Videos: 'v', Video: 'V' })).toEqual([{ name: 'v', url: 'v' }])
    expect(parseVideos({ id: 1, videos: 'v', Video: 'V' })).toEqual([{ name: 'v', url: 'v' }])
    expect(parseVideos({ id: 1, Video: 'V' })).toEqual([{ name: 'V', url: 'V' }])
  })

  it('uses the given default name for unnamed entries', () => {
    expect(parseVideos(itemWith([{ url: 'https://a/1' }]), 'PV')).toEqual([
      { name: 'PV', url: 'https://a/1' },
    ])
  })
})

describe('READ_STATUSES', () => {
  it('keeps the canonical stored order', () => {
    expect(READ_STATUSES).toEqual(['未读', '计划读', '正在读', '已读'])
  })
})
