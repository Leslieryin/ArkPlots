import { describe, expect, it } from 'vitest'

import { createT } from '../src/i18n/createTranslator'
import { statusLabelKey } from '../src/i18n'
import { DEFAULT_LOCALE, listLocales, localeRegistry, resolveLocale } from '../src/i18n/locales'
import { resolveCharacter, resolveCountry, resolvePlotName } from '../src/i18n/content'
import type { Messages } from '../src/i18n/types'

describe('createT', () => {
  const partial = {
    status: { unread: '未读' },
    recommend: { urgentTip: '先读 {a}，再读 {a}/{b}' },
  } as unknown as Messages

  it('resolves nested keys and returns the key itself when missing', () => {
    const t = createT(partial)
    expect(t('status.unread')).toBe('未读')
    // status.read 是合法键但没写进这份 messages —— 应回落为键名
    expect(t('status.read')).toBe('status.read')
    expect(t('meta.nativeName')).toBe('meta.nativeName')
  })

  it('replaces all occurrences of each parameter', () => {
    const t = createT(partial)
    expect(t('recommend.urgentTip', { a: '主线', b: '别传' })).toBe('先读 主线，再读 主线/别传')
    expect(t('recommend.urgentTip')).toBe('先读 {a}，再读 {a}/{b}')
  })
})

describe('statusLabelKey', () => {
  it('maps every canonical read status to its message key', () => {
    expect(statusLabelKey('未读')).toBe('status.unread')
    expect(statusLabelKey('计划读')).toBe('status.planned')
    expect(statusLabelKey('正在读')).toBe('status.reading')
    expect(statusLabelKey('已读')).toBe('status.read')
  })
})

describe('locale registry', () => {
  it('registers zh-CN, en-US and ja-JP with non-empty native names', () => {
    expect(listLocales().map((l) => l.code)).toEqual(['zh-CN', 'en-US', 'ja-JP'])
    expect(localeRegistry['zh-CN'].meta.nativeName).toBe('简体中文')
    expect(localeRegistry['en-US'].meta.nativeName.length).toBeGreaterThan(0)
    expect(localeRegistry['ja-JP'].meta.nativeName).toBe('日本語')
  })

  it('falls back to zh-CN for unknown or missing locale codes', () => {
    expect(DEFAULT_LOCALE).toBe('zh-CN')
    expect(resolveLocale('en-US')).toBe('en-US')
    expect(resolveLocale('ja-JP')).toBe('ja-JP')
    expect(resolveLocale('ZH-cn')).toBe('zh-CN')
    expect(resolveLocale('fr-FR')).toBe('zh-CN')
    expect(resolveLocale(null)).toBe('zh-CN')
    expect(resolveLocale(undefined)).toBe('zh-CN')
  })

  it('every locale has exactly the same key tree as the zh-CN reference', () => {
    // 语言包键位漂移守卫:任何语言少键/多键/改名都在这里炸出来
    const keyPathsOf = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' ? keyPathsOf(v as Record<string, unknown>, prefix + k + '.') : [prefix + k],
      )
    const reference = keyPathsOf(localeRegistry['zh-CN'] as unknown as Record<string, unknown>).sort()
    for (const [code, messages] of Object.entries(localeRegistry)) {
      const keys = keyPathsOf(messages as unknown as Record<string, unknown>).sort()
      expect(keys, `${code} 键位与 zh-CN 不一致`).toEqual(reference)
    }
  })

  it('ja-JP translates user-visible strings (not key placeholders)', () => {
    const ja = localeRegistry['ja-JP']
    expect(ja.status.unread).toBe('未読')
    expect(ja.classLabel.main).toBe('メイン')
    expect(ja.app.loading).toContain('読み込み')
    // 参数占位符必须原样保留
    expect(ja.video.title).toContain('{name}')
    expect(ja.version.current).toContain('{version}')
  })
})

describe('content resolvers', () => {
  it('resolvePlotName prefers the EN pack, then the fallback name, then the id', () => {
    expect(resolvePlotName('en-US', '1')).toBe('EP0. Evil Time (Part 1)')
    expect(resolvePlotName('zh-CN', '1', '局部坏死')).toBe('局部坏死')
    expect(resolvePlotName('en-US', '999999', '自定义名')).toBe('自定义名')
    expect(resolvePlotName('en-US', '999999')).toBe('ID:999999')
    expect(resolvePlotName('en-US', null)).toBe('')
  })

  it('resolveCountry uses the EN pack and passes zh-CN values through', () => {
    expect(resolveCountry('en-US', '乌萨斯')).toBe('Ursus')
    expect(resolveCountry('en-US', ' 乌萨斯 ')).toBe('Ursus')
    expect(resolveCountry('zh-CN', '乌萨斯')).toBe('乌萨斯')
    expect(resolveCountry('en-US', '不存在的势力')).toBe('不存在的势力')
    expect(resolveCountry('en-US', '')).toBe('')
    expect(resolveCountry('en-US', null)).toBe('')
  })

  it('resolveCharacter covers major story characters (regression guard)', () => {
    // 首要剧情角色的官方英文名必须持续有覆盖;未收录名回退源文,不属于失败
    expect(resolveCharacter('en-US', '特蕾西娅')).toBe('Theresa')
    expect(resolveCharacter('en-US', '霜星')).toBe('FrostNova')
    expect(resolveCharacter('en-US', '克丽斯腾·莱特')).toBe('Kristen Wright')
    expect(resolveCharacter('en-US', '亚当斯·施怀雅')).toBe('Adams Swire')
    expect(resolveCharacter('en-US', '月见夜')).toBe('Midnight')
    // 带引号的别名键与带注音的键都能命中
    expect(resolveCharacter('en-US', '“皇帝的利刃”')).toBe('Emperor\'s Blade')
    expect(resolveCharacter('en-US', '小沅（yuán）')).toBe('Xiao Yuan')
  })
})
