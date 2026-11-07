// @vitest-environment jsdom
/**
 * 组件渲染与交互测试(jsdom)。
 *
 * 覆盖三条主线:
 * 1. 语言切换:I18nProvider 驱动 <html lang> 与 UI 文案,切换持久化到 localStorage;
 * 2. StatusModal:选项文案走 i18n,但 onSave 回传的是数据键(未读/已读……,必须保持中文);
 * 3. DetailPanel:真实组件 + 真实数据条目渲染不崩,字段标签随语言切换。
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'

import { I18nProvider } from '../src/i18n'
import { LanguageSwitcher } from '../src/components/LanguageSwitcher'
import { StatusModal } from '../src/components/StatusModal'
import { DetailPanel } from '../src/components/DetailPanel'
import type { LocaleCode } from '../src/i18n'
import type { PlotItem } from '../src/types'

afterEach(cleanup)

/** 每个用例独立 localStorage,避免语言持久化串场。 */
function renderWithLocale(ui: ReactElement, locale: LocaleCode = 'zh-CN') {
  localStorage.clear()
  localStorage.setItem('arkplots.locale', locale)
  return render(<I18nProvider>{ui}</I18nProvider>)
}

const item: PlotItem = {
  id: 1,
  name: '测试条目',
  class: 'main',
  plot_stage: 1,
  date: '1097/01/01',
  description: '一段描述',
  country: ['乌萨斯'],
  related_plot: ['源石'],
  related_power: ['罗德岛'],
  first_appearance: ['阿米娅'],
  necessary_plot: [],
  optional_plot: [],
  Videos: [],
  chapter: '为了明日·觉醒',
}

const detailProps = {
  item: item as PlotItem,
  plotsMap: new Map([['1', item as PlotItem]]),
  records: { '1': '已读' },
  covers: {},
  canBack: false,
  canForward: false,
  onBack: vi.fn(),
  onForward: vi.fn(),
  onJump: vi.fn(),
  showNecessary: true,
  showOptional: true,
  showReason: true,
  showCover: false,
}

describe('LanguageSwitcher + I18nProvider', () => {
  beforeEach(() => {
    document.documentElement.lang = ''
  })

  it('lists every registered locale and defaults to 简体中文', () => {
    renderWithLocale(<LanguageSwitcher />)
    const select = screen.getByRole('combobox', { name: '语言' }) as HTMLSelectElement
    expect([...select.options].map((o) => o.value)).toEqual(['zh-CN', 'en-US', 'ja-JP'])
    expect(select.value).toBe('zh-CN')
  })

  it('switching to 日本語 updates <html lang> and translates labels', async () => {
    const user = userEvent.setup()
    renderWithLocale(<LanguageSwitcher />)
    const select = screen.getByRole('combobox', { name: '语言' })
    await user.selectOptions(select, 'ja-JP')
    expect(document.documentElement.lang).toBe('ja-JP')
    expect(screen.getByRole('combobox', { name: '言語' })).toBeInTheDocument()
    // 持久化:重新挂载后仍选中 ja-JP
    cleanup()
    render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>,
    )
    expect((screen.getByRole('combobox', { name: '言語' }) as HTMLSelectElement).value).toBe('ja-JP')
  })
})

describe('StatusModal', () => {
  it('renders localized status options while onSave receives the stable data key', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()
    renderWithLocale(<StatusModal title="设置阅读状态" onSave={onSave} onClose={onClose} initial="已读" />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    // 选项 value 是数据键(必须保持中文,与 Read_record.json 契约),文案是 i18n 标签
    expect([...select.options].map((o) => o.value)).toEqual(['未读', '计划读', '正在读', '已读'])
    expect(select.selectedOptions[0].textContent).toBe('已读')

    await user.selectOptions(select, '计划读')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledWith('计划读')
  })

  it('cancel closes without saving', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSave = vi.fn()
    renderWithLocale(<StatusModal title="t" onSave={onSave} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('DetailPanel', () => {
  it('renders a real item: localized labels, status and name', () => {
    renderWithLocale(<DetailPanel {...detailProps} />, 'zh-CN')
    expect(screen.getByText('测试条目')).toBeInTheDocument()
    expect(screen.getByText('首次出场角色')).toBeInTheDocument()
    expect(screen.getByText('章节所属')).toBeInTheDocument()
  })

  it('ja locale translates field labels and the stored status label', () => {
    renderWithLocale(<DetailPanel {...detailProps} />, 'ja-JP')
    expect(screen.getByText('初登場キャラクター')).toBeInTheDocument()
    expect(screen.getByText('章節')).toBeInTheDocument()
    // records['1'] = '已读'(数据键)在 ja 下显示为 読了
    expect(screen.getByText('読了')).toBeInTheDocument()
  })

  it('empty selection shows the pick hint', () => {
    renderWithLocale(
      <DetailPanel {...detailProps} item={null} />,
      'ja-JP',
    )
    expect(screen.getByText('左側の項目を選択すると詳細が表示されます')).toBeInTheDocument()
  })
})
