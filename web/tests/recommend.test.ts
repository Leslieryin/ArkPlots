import { describe, expect, it } from 'vitest'

import { computeRecommendations, READ_DONE_STATUS } from '../src/recommend'
import type { PlotItem } from '../src/types'

const plot = (id: string | number, over: Partial<PlotItem> = {}): PlotItem => ({ id, ...over })
const read = (...ids: (string | number)[]) =>
  Object.fromEntries(ids.map((id) => [String(id), READ_DONE_STATUS]))

describe('computeRecommendations', () => {
  it('puts prereq-free unread plots into recContinue', () => {
    const buckets = computeRecommendations([plot('1'), plot(2)], {})
    expect(buckets.recContinue).toEqual(['1', '2'])
    expect(buckets.urgent).toEqual([])
    expect(buckets.recSupp).toEqual([])
    expect(buckets.canContinue).toEqual([])
  })

  it('flags unread necessary prereqs of read plots as urgent, walking the whole chain', () => {
    const plots = [plot('a', { necessary_plot: ['b'] }), plot('b', { necessary_plot: ['c'] }), plot('c')]
    const buckets = computeRecommendations(plots, read('a'))
    expect(buckets.urgent).toEqual(['b', 'c'])
  })

  it('flags unread optional prereqs of read plots as recSupp, below urgent', () => {
    const plots = [
      plot('a', { necessary_plot: ['u'], optional_plot: ['s1', 's2'] }),
      plot('u'),
      plot('s1'),
      plot('s2'),
    ]
    const buckets = computeRecommendations(plots, read('a'))
    expect(buckets.urgent).toEqual(['u'])
    expect(buckets.recSupp).toEqual(['s1', 's2'])
  })

  it('drops already-read targets from recSupp', () => {
    const plots = [plot('a', { optional_plot: ['s'] }), plot('s')]
    const buckets = computeRecommendations(plots, read('a', 's'))
    expect(buckets.recSupp).toEqual([])
  })

  it('an unread plot with unread optional but readable prerequisites goes to canContinue', () => {
    const plots = [plot('a', { optional_plot: ['s'] }), plot('s')]
    const buckets = computeRecommendations(plots, {})
    expect(buckets.canContinue).toEqual(['a'])
    expect(buckets.recContinue).toEqual(['s'])
  })

  it('an unread plot with unread necessary appears only via the urgent chain', () => {
    const plots = [plot('a', { necessary_plot: ['b'] }), plot('b')]
    const buckets = computeRecommendations(plots, {})
    expect(buckets.recContinue).toEqual(['b'])
    expect(buckets.canContinue).toEqual([])
    expect(buckets.urgent).toEqual([])
  })

  it('deduplicates across buckets with urgent > recSupp > recContinue priority', () => {
    const plots = [plot('r1', { necessary_plot: ['x'] }), plot('r2', { optional_plot: ['x'] }), plot('x')]
    const buckets = computeRecommendations(plots, read('r1', 'r2'))
    expect(buckets.urgent).toEqual(['x'])
    expect(buckets.recSupp).toEqual([])
    expect(buckets.recContinue).toEqual([])
  })

  it('accepts object-shaped prereq refs and numeric ids', () => {
    const plots = [
      plot('a', { necessary_plot: [{ id: 5, reason: '补前置' }, { pid: 6 }] }),
      plot(5),
      plot(6),
    ]
    const buckets = computeRecommendations(plots, read('a'))
    expect(buckets.urgent).toEqual(['5', '6'])
  })

  it('keeps unknown prereq ids in urgent even when they are not real plots', () => {
    const plots = [plot('a', { necessary_plot: ['ghost'] })]
    const buckets = computeRecommendations(plots, read('a'))
    expect(buckets.urgent).toEqual(['ghost'])
  })

  it('only 已读 counts as read', () => {
    const plots = [plot('a', { necessary_plot: ['b'] }), plot('b')]
    const buckets = computeRecommendations(plots, { a: '正在读', b: READ_DONE_STATUS })
    expect(buckets.urgent).toEqual([])
    expect(buckets.recContinue).toEqual(['a'])
  })

  it('read plots never appear in any bucket', () => {
    const plots = [
      plot('a', { necessary_plot: ['b'] }),
      plot('b', { optional_plot: ['c'] }),
      plot('c'),
    ]
    const buckets = computeRecommendations(plots, read('a', 'b', 'c'))
    expect(buckets.urgent).toEqual([])
    expect(buckets.recSupp).toEqual([])
    expect(buckets.recContinue).toEqual([])
    expect(buckets.canContinue).toEqual([])
  })

  it('sorts ids numerically first and lexicographically otherwise', () => {
    const plots = [plot('10'), plot('2'), plot('x1'), plot('x2')]
    const buckets = computeRecommendations(plots, {})
    expect(buckets.recContinue).toEqual(['2', '10', 'x1', 'x2'])
  })
})
