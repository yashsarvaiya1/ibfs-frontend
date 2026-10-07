/* eslint-disable @typescript-eslint/no-require-imports -- Node's built-in test runner loads CommonJS modules. */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { QueryClient } = require('@tanstack/react-query')

// Run real application modules with only their network/browser boundaries replaced.
function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loaded = { exports: {} }
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports,
    require: name => name in mocks ? mocks[name] : require(name), AbortController, ...globals }, { filename: file })
  return loaded.exports
}
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function setup(cookie = '') {
  const memory = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) } }
  const localStorage = memory(), sessionStorage = memory()
  const auth = load('stores/authStore.ts', {}, { window: {}, localStorage, sessionStorage })
  const gets = [], posts = []
  let get = () => Promise.resolve({ data: { authenticated: false, username: null, csrf_token: 'preflight' } })
  let post = () => Promise.resolve({ data: { authenticated: true, username: 'review', csrf_token: 'rotated' } })
  let cleared = 0
  const api = { get: (...args) => { gets.push(args); return get(...args) }, post: (...args) => { posts.push(args); return post(...args) } }
  const { sessionService } = load('services/sessionService.ts', {
    '@/lib/axios': { default: api }, '@/stores/authStore': auth,
    '@/lib/offline/vault': { clearOffline: async () => { cleared++ } },
  }, { document: { cookie } })
  return { auth, service: sessionService, gets, posts, localStorage,
    setGet: fn => { get = fn }, setPost: fn => { post = fn }, cleared: () => cleared }
}

test('existing CSRF cookie bypasses a hanging status check and stale replies cannot overwrite login', async () => {
  const t = setup('csrftoken=cookie-current')
  const pending = deferred(); t.setGet(() => pending.promise)
  const old = t.service.status(); const staleRejected = assert.rejects(old, /superseded/)
  await t.service.login('review', 'secret')
  assert.equal(t.gets.length, 1)
  assert.equal(t.gets[0][1].signal.aborted, true)
  assert.equal(t.posts[0][2].headers['X-CSRFToken'], 'cookie-current')
  assert.equal(t.auth.useAuthStore.getState().csrfToken, 'rotated')
  pending.resolve({ data: { authenticated: false, username: null, csrf_token: 'old' } })
  await staleRejected
  assert.equal(t.auth.useAuthStore.getState().csrfToken, 'rotated')
  assert.equal(t.auth.useAuthStore.getState().isAuthenticated, true)
})

test('first login fetches CSRF with a bounded preflight, then submits and rotates it', async () => {
  const t = setup()
  await t.service.login('review', 'secret')
  assert.equal(t.gets.length, 1)
  assert.ok(t.gets[0][1].timeout <= 10000)
  assert.equal(t.posts[0][2].headers['X-CSRFToken'], 'preflight')
  assert.equal(t.auth.useAuthStore.getState().csrfToken, 'rotated')
})

test('failed server logout immediately clears authentication, locks restoration and clears offline data', async () => {
  const t = setup('csrftoken=valid-cookie')
  t.auth.useAuthStore.getState().login('review', 'valid')
  const pending = deferred(); t.setPost(() => pending.promise)
  const logout = t.service.logout(); const rejection = assert.rejects(logout, /unreachable/)
  assert.equal(t.auth.useAuthStore.getState().isAuthenticated, false)
  assert.equal(t.auth.isSessionRestoreBlocked(), true)
  assert.equal(t.localStorage.getItem(t.auth.SESSION_LOCK_KEY), 'true')
  assert.equal(t.cleared(), 1)
  assert.equal(t.posts[0][2].headers['X-CSRFToken'], 'valid-cookie')
  pending.reject(new Error('unreachable')); await rejection
  t.setPost(() => Promise.resolve({ data: { authenticated: true, username: 'review', csrf_token: 'fresh' } }))
  await t.service.login('review', 'secret')
  assert.equal(t.auth.isSessionRestoreBlocked(), false)
})

test('logout prevents late status and login responses from reopening the workspace', async () => {
  const t = setup('csrftoken=valid')
  const status = deferred(), login = deferred()
  t.setGet(() => status.promise)
  const check = assert.rejects(t.service.status(), /superseded/)
  t.setPost(url => url === '/session/login/' ? login.promise : Promise.resolve({ data: {} }))
  const attempt = assert.rejects(t.service.login('review', 'secret'), /superseded/)
  await t.service.logout()
  status.resolve({ data: { authenticated: true, username: 'review', csrf_token: 'old' } })
  login.resolve({ data: { authenticated: true, username: 'review', csrf_token: 'late' } })
  await Promise.all([check, attempt])
  assert.equal(t.auth.useAuthStore.getState().isAuthenticated, false)
  assert.equal(t.auth.isSessionRestoreBlocked(), true)
})

test('opening balance update invalidates all cached ledger ranges and period opening balances', async () => {
  const client = new QueryClient()
  const hooks = load('hooks/useAccount.ts', {
    '@tanstack/react-query': { useMutation: config => config, useQueryClient: () => client },
    '@/services/accountService': { accountService: { update: async () => ({ opening_balance: '2000' }) } },
  })
  const ledger = hooks.accountTxnsKey(7, { view: 'ledger', date_from: '2026-10-01' })
  const history = hooks.accountTxnsKey(7, { view: 'list', page: 2 })
  for (const key of [hooks.accountKey(7), ledger, history]) client.setQueryData(key, { balance_before_period: '1000', results: [] })
  const mutation = hooks.useUpdateAccount(7)
  await mutation.mutationFn({ opening_balance: '2000' }); mutation.onSuccess()
  for (const key of [hooks.accountKey(7), ledger, history]) assert.equal(client.getQueryState(key).isInvalidated, true)
  client.clear()
})

test('a local lock in another tab also rejects an already pending sign-in response', async () => {
  const t = setup('csrftoken=valid')
  const pending = deferred(); t.setPost(() => pending.promise)
  const rejected = assert.rejects(t.service.login('review', 'secret'), /superseded/)
  t.auth.useAuthStore.getState().logout()
  pending.resolve({ data: { authenticated: true, username: 'review', csrf_token: 'late' } })
  await rejected
  assert.equal(t.auth.useAuthStore.getState().isAuthenticated, false)
  assert.equal(t.auth.isSessionRestoreBlocked(), true)
})
