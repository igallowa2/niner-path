// @vitest-environment node
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, type AppConfig } from './app'

// These tests NEVER call the real Adzuna or O*NET: `fetchImpl` is a fake.
const KEYS = { adzunaAppId: 'test-id', adzunaAppKey: 'SECRET-ADZUNA-KEY', onetApiKey: 'SECRET-ONET-KEY' }

const adzunaReply = {
  count: 2,
  results: [
    {
      id: 101,
      title: '<strong>Data</strong> Analyst Intern',
      description: 'Work with <b>SQL</b>&nbsp;and   Python.',
      redirect_url: 'https://www.adzuna.com/details/101',
      created: '2026-11-01T10:00:00Z',
      contract_time: 'full_time',
      salary_min: 50000,
      salary_max: 60000,
      company: { display_name: 'Sample Bank' },
      location: { display_name: 'Charlotte, Mecklenburg County' },
      category: { label: 'Accounting & Finance Jobs' },
    },
    { id: 102, title: 'Analyst', redirect_url: 'javascript:alert(1)' },
  ],
}

const onetReply = {
  start: 1,
  end: 2,
  total: 2,
  occupation: [
    { code: '15-2051.00', title: 'Data Scientists', href: 'https://api-v2.onetcenter.org/online/occupations/15-2051.00/', tags: { bright_outlook: true } },
    { code: '19-3011.00', title: 'Economists', href: 'https://api-v2.onetcenter.org/online/occupations/19-3011.00/', tags: {} },
  ],
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let server: Server | undefined
afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())))

async function start(config: AppConfig) {
  server = createApp(config).listen(0, '127.0.0.1')
  await new Promise((r) => server!.once('listening', r))
  const { port } = server.address() as AddressInfo
  return (path: string) => fetch(`http://127.0.0.1:${port}${path}`)
}

describe('GET /api/jobs (Adzuna)', () => {
  it('calls Adzuna with our search and returns simplified, safe job listings', async () => {
    const fetchImpl = vi.fn(async () => json(adzunaReply))
    const get = await start({ ...KEYS, fetchImpl })

    const res = await get('/api/jobs?what=data%20analyst&where=Charlotte')
    const body = await res.json()

    expect(res.status).toBe(200)
    const calledUrl = new URL(String(fetchImpl.mock.calls[0][0]))
    expect(calledUrl.pathname).toBe('/v1/api/jobs/us/search/1')
    expect(calledUrl.searchParams.get('what')).toBe('data analyst')
    expect(calledUrl.searchParams.get('where')).toBe('Charlotte')

    expect(body.total).toBe(2)
    expect(body.jobs[0]).toEqual({
      id: '101',
      title: 'Data Analyst Intern',
      company: 'Sample Bank',
      location: 'Charlotte, Mecklenburg County',
      category: 'Accounting & Finance Jobs',
      contractTime: 'full_time',
      salaryMin: 50000,
      salaryMax: 60000,
      url: 'https://www.adzuna.com/details/101',
      created: '2026-11-01T10:00:00Z',
      snippet: 'Work with SQL and Python.',
    })
    // Missing fields get sensible defaults, and unsafe links are dropped.
    expect(body.jobs[1]).toMatchObject({ company: 'Company not listed', url: '', salaryMin: null })
    // The key must never reach the browser.
    expect(JSON.stringify(body)).not.toContain('SECRET')
  })

  it('serves a repeat search from the cache instead of calling Adzuna again', async () => {
    const fetchImpl = vi.fn(async () => json(adzunaReply))
    const get = await start({ ...KEYS, fetchImpl })

    const first = await get('/api/jobs?what=analyst')
    const second = await get('/api/jobs?what=ANALYST%20') // same search, different case/spaces
    expect(first.headers.get('x-cache')).toBe('MISS')
    expect(second.headers.get('x-cache')).toBe('HIT')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('calls Adzuna again after the cache expires (10 minutes)', async () => {
    let clock = 0
    const fetchImpl = vi.fn(async () => json(adzunaReply))
    const get = await start({ ...KEYS, fetchImpl, now: () => clock })

    await get('/api/jobs?what=analyst')
    clock += 10 * 60 * 1000 + 1
    await get('/api/jobs?what=analyst')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('rejects an empty search without calling Adzuna', async () => {
    const fetchImpl = vi.fn()
    const get = await start({ ...KEYS, fetchImpl })
    const res = await get('/api/jobs?what=%20%20')
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('bad_request')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects a search longer than 100 characters', async () => {
    const get = await start({ ...KEYS, fetchImpl: vi.fn() })
    const res = await get(`/api/jobs?what=${'a'.repeat(101)}`)
    expect(res.status).toBe(400)
  })

  it('says "not configured" when keys are missing or still placeholders', async () => {
    const get = await start({ adzunaAppId: 'your-adzuna-app-id', adzunaAppKey: '', fetchImpl: vi.fn() })
    const res = await get('/api/jobs?what=analyst')
    expect(res.status).toBe(503)
    expect((await res.json()).error.code).toBe('not_configured')
  })

  it('reports a bad key without leaking it', async () => {
    const get = await start({ ...KEYS, fetchImpl: vi.fn(async () => json({ exception: 'AUTH_FAIL' }, 401)) })
    const res = await get('/api/jobs?what=analyst')
    const text = await res.text()
    expect(res.status).toBe(502)
    expect(JSON.parse(text).error.code).toBe('bad_key')
    expect(text).not.toContain('SECRET')
  })

  it('reports the rate limit, and does not cache the failure', async () => {
    const fetchImpl = vi.fn(async () => json({}, 429))
    const get = await start({ ...KEYS, fetchImpl })
    const res = await get('/api/jobs?what=analyst')
    expect(res.status).toBe(429)
    expect((await res.json()).error.code).toBe('rate_limited')
    await get('/api/jobs?what=analyst')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('reports a network failure when Adzuna cannot be reached', async () => {
    const get = await start({ ...KEYS, fetchImpl: vi.fn(async () => { throw new TypeError('fetch failed') }) })
    const res = await get('/api/jobs?what=analyst')
    expect(res.status).toBe(504)
    expect((await res.json()).error.code).toBe('network')
  })
})

describe('GET /api/careers (O*NET)', () => {
  it('sends the key in the X-API-Key header and returns simplified careers', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => json(onetReply))
    const get = await start({ ...KEYS, fetchImpl })

    const res = await get('/api/careers?keyword=economics')
    const body = await res.json()

    const [url, init] = fetchImpl.mock.calls[0]
    expect(new URL(String(url)).origin).toBe('https://api-v2.onetcenter.org')
    expect(new URL(String(url)).searchParams.get('keyword')).toBe('economics')
    const headers = (init?.headers ?? {}) as Record<string, string>
    expect(headers['X-API-Key']).toBe('SECRET-ONET-KEY')
    expect(String(url)).not.toContain('SECRET') // key is in the header, never the URL

    expect(body).toEqual({
      total: 2,
      careers: [
        { code: '15-2051.00', title: 'Data Scientists', brightOutlook: true },
        { code: '19-3011.00', title: 'Economists', brightOutlook: false },
      ],
    })
  })

  it('treats O*NET "no data" (422) as an empty list', async () => {
    const get = await start({ ...KEYS, fetchImpl: vi.fn(async () => json({ error: 'no data' }, 422)) })
    const res = await get('/api/careers?keyword=zzzz')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ careers: [], total: 0 })
  })

  it('caches career searches', async () => {
    const fetchImpl = vi.fn(async () => json(onetReply))
    const get = await start({ ...KEYS, fetchImpl })
    await get('/api/careers?keyword=economics')
    await get('/api/careers?keyword=Economics')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('GET /api/health', () => {
  it('shows which services are configured without revealing keys', async () => {
    const get = await start({ ...KEYS, onetApiKey: undefined })
    const text = await (await get('/api/health')).text()
    expect(JSON.parse(text)).toEqual({ ok: true, adzunaConfigured: true, onetConfigured: false })
    expect(text).not.toContain('SECRET')
  })
})
