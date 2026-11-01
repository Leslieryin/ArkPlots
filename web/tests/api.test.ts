import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applyUpdate,
  checkUpdate,
  exitAfterUpdate,
  fetchCovers,
  fetchPlots,
  fetchRecords,
  fetchVersion,
  saveRecords,
} from '../src/api'

const calls: { url: string; init?: RequestInit }[] = []

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

/** 用假 fetch 替换全局对象；每次调用先清空记录。 */
function stubFetch(
  impl: (url: string, init?: RequestInit) => Response | Promise<Response>,
): void {
  calls.length = 0
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return impl(url, init)
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchPlots / fetchRecords / saveRecords', () => {
  it('parses JSON on success', async () => {
    stubFetch(() => jsonResponse({ data: [1] }))
    await expect(fetchPlots()).resolves.toEqual({ data: [1] })
    expect(calls[0].url).toBe('/api/plots')
  })

  it('surfaces the API error message on HTTP failures', async () => {
    stubFetch(() => jsonResponse({ error: 'boom' }, { status: 500 }))
    await expect(fetchPlots()).rejects.toThrow('boom')
  })

  it('prefers hint over status text and falls back to status text', async () => {
    stubFetch(() =>
      jsonResponse({ hint: '只读模式' }, { status: 503, statusText: 'Service Unavailable' }),
    )
    await expect(fetchRecords()).rejects.toThrow('只读模式')
    stubFetch(() => new Response('nope', { status: 502, statusText: 'Bad Gateway' }))
    await expect(fetchRecords()).rejects.toThrow('Bad Gateway')
  })

  it('uses "HTTP <status>" when the status text is empty', async () => {
    stubFetch(() => new Response('x', { status: 502, statusText: '' }))
    await expect(fetchRecords()).rejects.toThrow('HTTP 502')
  })

  it('sends records as a PUT with a JSON body', async () => {
    stubFetch(() => jsonResponse({}))
    const records = { '1': '已读' }
    await saveRecords(records)
    expect(calls[0].url).toBe('/api/records')
    expect(calls[0].init?.method).toBe('PUT')
    expect(calls[0].init?.body).toBe(JSON.stringify(records))
  })
})

describe('update endpoints', () => {
  it('returns parsed data even on soft errors (502 with a JSON body)', async () => {
    stubFetch(() => jsonResponse({ ok: false, message: 'proxy hiccup' }, { status: 502 }))
    const res = await checkUpdate('release')
    expect(res.message).toBe('proxy hiccup')
    expect(calls[0].url).toBe('/api/update/check?channel=release')
  })

  it('selects the preview channel via query string', async () => {
    stubFetch(() => jsonResponse({ ok: true }))
    await checkUpdate('preview')
    expect(calls[0].url).toBe('/api/update/check?channel=preview')
  })

  it('throws when the body is not JSON and the status is an error', async () => {
    stubFetch(() => new Response('<html>', { status: 502, statusText: 'Bad Gateway' }))
    await expect(checkUpdate('release')).rejects.toThrow('Bad Gateway')
  })

  it('throws on an empty 200 response', async () => {
    stubFetch(() => new Response('', { status: 200 }))
    await expect(checkUpdate('release')).rejects.toThrow('Empty response')
  })

  it('applyUpdate posts restart/defer_exit/channel', async () => {
    stubFetch(() => jsonResponse({ ok: true }))
    await applyUpdate(false, true, 'preview')
    expect(calls[0].url).toBe('/api/update/apply')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      restart: false,
      defer_exit: true,
      channel: 'preview',
    })
  })

  it('exitAfterUpdate posts to /api/update/exit', async () => {
    stubFetch(() => jsonResponse({ ok: true }))
    await exitAfterUpdate()
    expect(calls[0].url).toBe('/api/update/exit')
    expect(calls[0].init?.method).toBe('POST')
  })
})

describe('fetchVersion', () => {
  it('returns the parsed version info', async () => {
    stubFetch(() => jsonResponse({ version: '26.10.28.11' }))
    await expect(fetchVersion()).resolves.toEqual({ version: '26.10.28.11' })
  })

  it('returns null when the server is unreachable', async () => {
    stubFetch(() => Promise.reject(new TypeError('ECONNREFUSED')))
    await expect(fetchVersion()).resolves.toBeNull()
  })
})

describe('fetchCovers', () => {
  it('maps valid entries, drops empty values and stringifies keys', async () => {
    stubFetch(() => jsonResponse({ 1: 'covers/1.png', 2: null, 3: '', 4: 5 }))
    await expect(fetchCovers()).resolves.toEqual({ '1': 'covers/1.png', '4': '5' })
    expect(calls[0].url).toBe('/covers/covers.json')
  })

  it('returns an empty map on HTTP errors and non-object payloads', async () => {
    stubFetch(() => new Response('nope', { status: 404 }))
    await expect(fetchCovers()).resolves.toEqual({})
    stubFetch(() => jsonResponse(['a']))
    await expect(fetchCovers()).resolves.toEqual({})
  })

  it('returns an empty map when the request fails', async () => {
    stubFetch(() => Promise.reject(new TypeError('offline')))
    await expect(fetchCovers()).resolves.toEqual({})
  })
})
