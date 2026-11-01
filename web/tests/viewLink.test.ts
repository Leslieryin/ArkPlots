import { describe, expect, it } from 'vitest'

import { viewLinkFor } from '../src/viewLink'

const PRTS = 'https://prts.wiki/w/'

describe('viewLinkFor', () => {
  it('returns null without a name or for class other', () => {
    expect(viewLinkFor({ id: 1 })).toBeNull()
    expect(viewLinkFor({ id: 1, name: '  ' })).toBeNull()
    expect(viewLinkFor({ id: 1, name: '未知', class: 'other' })).toBeNull()
  })

  it('links anime by id and returns null for unknown ids', () => {
    expect(viewLinkFor({ id: '61', name: '明日方舟', class: 'anime' })).toBe(
      'https://www.bilibili.com/bangumi/play/ep706350',
    )
    expect(viewLinkFor({ id: '999', name: '明日方舟', class: 'anime' })).toBeNull()
  })

  it('links known comics regardless of class', () => {
    expect(viewLinkFor({ id: 1, name: '罗德岛相簿', class: 'sidestory' })).toBe(
      'https://comic.hypergryph.com/terra-historicus/comic/2865',
    )
  })

  it('returns null for manga without a comic id', () => {
    expect(viewLinkFor({ id: 1, name: '某漫画', class: 'manga' })).toBeNull()
  })

  it('links roguelike activities to their PRTS page (spaces become underscores)', () => {
    expect(viewLinkFor({ id: 1, name: '傀影与猩红孤钻', class: 'rougelike' })).toBe(
      PRTS + encodeURIComponent('傀影与猩红孤钻'),
    )
    expect(viewLinkFor({ id: 1, name: 'a b', class: 'rougelike' })).toBe(PRTS + 'a_b')
  })

  it('maps 生息演算 titles to their own pages and returns null for unknown RA names', () => {
    expect(viewLinkFor({ id: 1, name: '生息演算：沙中之火', class: 'RA' })).toBe(
      PRTS + encodeURIComponent('沙中之火'),
    )
    expect(viewLinkFor({ id: 1, name: '生息演算：未知', class: 'RA' })).toBeNull()
  })

  it('strips the EP prefix for main theme and uses a text fragment', () => {
    expect(viewLinkFor({ id: 1, name: 'EP14. 慈悲灯塔', class: 'main' })).toBe(
      `${PRTS}${encodeURIComponent('剧情一览')}#:~:text=${encodeURIComponent('慈悲灯塔')}`,
    )
  })

  it('links sidestories to the 情报处理室 anchor, applying aliases', () => {
    expect(viewLinkFor({ id: 1, name: '烘炉示岁', class: 'sidestory' })).toBe(
      `${PRTS}${encodeURIComponent('情报处理室')}#${encodeURIComponent('洪炉示岁')}`,
    )
    expect(viewLinkFor({ id: 1, name: '骑兵与猎人', class: 'sidestory' })).toBe(
      `${PRTS}${encodeURIComponent('情报处理室')}#${encodeURIComponent('骑兵与猎人')}`,
    )
  })

  it('sends room-listed activity pages straight to the wiki', () => {
    expect(viewLinkFor({ id: 1, name: '落叶逐火', class: 'sidestory' })).toBe(
      PRTS + encodeURIComponent('落叶逐火'),
    )
  })

  it('treats a missing class like a room sidestory', () => {
    expect(viewLinkFor({ id: 1, name: '骑兵与猎人' })).toBe(
      `${PRTS}${encodeURIComponent('情报处理室')}#${encodeURIComponent('骑兵与猎人')}`,
    )
  })
})
