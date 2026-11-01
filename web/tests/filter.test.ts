import { describe, expect, it } from 'vitest'

import { collectFilterOptions, matchesFilters } from '../src/filter'
import type { Filters, PlotItem } from '../src/types'

const item = (over: Partial<PlotItem> = {}): PlotItem => ({ id: 1, ...over })

describe('matchesFilters date range', () => {
  it('keeps items inside an inclusive range', () => {
    const filters: Filters = { start: '2020-01-01', end: '2020-12-31' }
    expect(matchesFilters(item({ date: '2020-01-01' }), filters)).toBe(true)
    expect(matchesFilters(item({ date: '2020-12-31' }), filters)).toBe(true)
    expect(matchesFilters(item({ date: '2019-12-31' }), filters)).toBe(false)
    expect(matchesFilters(item({ date: '2021-01-01' }), filters)).toBe(false)
  })

  it('ignores the range when the item date is missing or malformed', () => {
    const filters: Filters = { start: '2020-01-01' }
    expect(matchesFilters(item({ date: 'not-a-date' }), filters)).toBe(true)
    expect(matchesFilters(item(), filters)).toBe(true)
  })
})

describe('matchesFilters status', () => {
  it('treats items as 未读 when recordStatus is omitted', () => {
    expect(matchesFilters(item(), { status: ['已读'] })).toBe(false)
    expect(matchesFilters(item(), { status: ['未读'] })).toBe(true)
  })

  it('uses the provided record status', () => {
    const filters: Filters = { status: ['正在读', '已读'] }
    const matchers = { recordStatus: (id: string) => (id === '1' ? '正在读' : '未读') }
    expect(matchesFilters(item({ id: 1 }), filters, matchers)).toBe(true)
    expect(matchesFilters(item({ id: 2 }), filters, matchers)).toBe(false)
  })
})

describe('matchesFilters class', () => {
  it('drops items without a class when the filter is set', () => {
    expect(matchesFilters(item(), { class: ['main'] })).toBe(false)
    expect(matchesFilters(item({ class: 'sidestory' }), { class: ['main'] })).toBe(false)
    expect(matchesFilters(item({ class: 'main' }), { class: ['main'] })).toBe(true)
  })
})

describe('matchesFilters country', () => {
  it('any mode needs one overlap', () => {
    const filters: Filters = { country: ['炎', '维多利亚'] }
    expect(matchesFilters(item({ country: '炎' }), filters)).toBe(true)
    expect(matchesFilters(item({ country: ['乌萨斯', '炎'] }), filters)).toBe(true)
    expect(matchesFilters(item({ country: '乌萨斯' }), filters)).toBe(false)
  })

  it('all mode needs every selected value', () => {
    const filters: Filters = { country: ['炎', '维多利亚'], country_mode: 'all' }
    expect(matchesFilters(item({ country: ['炎', '维多利亚', '雷姆必拓'] }), filters)).toBe(true)
    expect(matchesFilters(item({ country: ['炎'] }), filters)).toBe(false)
  })
})

describe('matchesFilters operator search', () => {
  it('matches operator CN names case-insensitively and trims the query', () => {
    const filters: Filters = { new_operator: '  阿米娅 ' }
    expect(matchesFilters(item({ new_operator: '阿米娅' }), filters)).toBe(true)
    expect(matchesFilters(item({ new_operator: ['凯尔希', '阿米娅'] }), filters)).toBe(true)
    expect(matchesFilters(item({ new_operator: '凯尔希' }), filters)).toBe(false)
  })

  it('falls back to localized labels for substring search', () => {
    const filters: Filters = { new_operator: 'amiya' }
    const matchers = { operatorLabel: (cn: string) => (cn === '阿米娅' ? 'Amiya' : cn) }
    expect(matchesFilters(item({ new_operator: '阿米娅' }), filters, matchers)).toBe(true)
    expect(matchesFilters(item({ new_operator: '凯尔希' }), filters, matchers)).toBe(false)
  })

  it('also searches first-appearance characters via characterLabel', () => {
    const filters: Filters = { new_operator: 'theresia' }
    const matchers = { characterLabel: (cn: string) => (cn === '特蕾西娅' ? 'Theresia' : cn) }
    expect(matchesFilters(item({ first_appearance: '特蕾西娅' }), filters, matchers)).toBe(true)
    expect(matchesFilters(item({ first_appearance: '迷图' }), filters, matchers)).toBe(false)
  })
})

describe('matchesFilters remaining dimensions', () => {
  it('matches numeric plot stages across string/number values', () => {
    expect(matchesFilters(item({ plot_stage: '2' }), { plot_stage: [2] })).toBe(true)
    expect(matchesFilters(item({ plot_stage: 3 }), { plot_stage: [2] })).toBe(false)
  })

  it('filters by chapter and drops items without one', () => {
    const filters: Filters = { chapter: ['方舟'] }
    expect(matchesFilters(item({ chapter: '方舟' }), filters)).toBe(true)
    expect(matchesFilters(item({ chapter: ' 方舟 ' }), filters)).toBe(true)
    expect(matchesFilters(item(), filters)).toBe(false)
  })

  it('related_power supports any/all modes', () => {
    expect(
      matchesFilters(item({ related_power: ['源石技艺'] }), {
        related_power: ['源石技艺', '机械'],
      }),
    ).toBe(true)
    expect(
      matchesFilters(item({ related_power: ['源石技艺'] }), {
        related_power: ['源石技艺', '机械'],
        power_mode: 'all',
      }),
    ).toBe(false)
  })

  it('related_plot supports any/all modes', () => {
    expect(matchesFilters(item({ related_plot: 'main-1' }), { related_plot: ['main-1'] })).toBe(true)
    expect(
      matchesFilters(item({ related_plot: ['main-1'] }), {
        related_plot: ['main-1', 'main-2'],
        rplot_mode: 'all',
      }),
    ).toBe(false)
  })
})

describe('collectFilterOptions', () => {
  it('collects unique sorted options across items', () => {
    const plots: PlotItem[] = [
      item({
        id: 1,
        class: 'main',
        country: '炎',
        plot_stage: 0,
        related_power: '源石技艺',
        related_plot: ['main-0'],
        chapter: '方舟',
        date: '2019-05-01',
      }),
      item({
        id: 2,
        class: 'main',
        country: ['炎', '乌萨斯'],
        plot_stage: '1',
        related_power: ['源石技艺', '机械'],
        related_plot: 'main-1',
        chapter: '燎原',
        date: '2020-08-15T12:00',
      }),
      item({ id: 3, class: 'sidestory', plot_stage: 1, date: 'bad-date' }),
    ]
    const options = collectFilterOptions(plots)
    expect(options.classes).toEqual(['main', 'sidestory'])
    expect(options.countries).toEqual(['乌萨斯', '炎'])
    expect(options.stages).toEqual([0, 1])
    expect(options.powers).toEqual(['机械', '源石技艺'])
    expect(options.rplots).toEqual(['main-0', 'main-1'])
    expect(options.years).toEqual([2019, 2020])
  })

  it('skips empty and non-numeric stages', () => {
    expect(collectFilterOptions([item({ plot_stage: '' }), item({ plot_stage: 'x' })]).stages).toEqual([])
  })

  it('orders chapters by the known reading order, trimmed, unknowns sorted after', () => {
    const options = collectFilterOptions([
      item({ chapter: '自海渊的一瞥' }),
      item({ chapter: '方舟' }),
      item({ chapter: '未知章节' }),
      item({ chapter: '燎原' }),
      item({ chapter: '未知前传' }),
      item({ chapter: ' 方舟 ' }),
    ])
    expect(options.chapters).toEqual(['方舟', '燎原', '自海渊的一瞥', '未知前传', '未知章节'])
  })

  it('returns empty options for no plots', () => {
    expect(collectFilterOptions([])).toEqual({
      classes: [],
      countries: [],
      stages: [],
      powers: [],
      rplots: [],
      chapters: [],
      years: [],
    })
  })
})
