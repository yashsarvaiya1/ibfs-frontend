// Only explicitly saved PDFs/drafts enter IndexedDB. Financial APIs remain network-only.
export interface Envelope { iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer }
export interface VaultConfig { id: string; owner: string; salt: Uint8Array<ArrayBuffer>; verifier: Envelope }
export interface SavedMeta { id: string; title: string; filename: string; kind: 'pdf' | 'draft'; savedAt: string; sourceUpdatedAt?: string }
interface SavedFile { id: string; meta: Envelope; body: Envelope }
let active: { config: VaultConfig; key: CryptoKey } | null = null
let channel: BroadcastChannel | null = null
let clearing: Promise<void> | null = null
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const eventName = 'ibfs-offline-change'

function announce() { if (typeof window !== 'undefined') window.dispatchEvent(new Event(eventName)) }
function connect() {
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('ibfs-offline-lock')
    channel.onmessage = () => { active = null; announce() }
  }
}
export function observeVault(callback: () => void) { connect(); window.addEventListener(eventName, callback); return () => window.removeEventListener(eventName, callback) }
export function lockVault() { active = null; connect(); channel?.postMessage('lock'); announce() }
export function isUnlocked() { return active !== null }

function openDB(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB || !globalThis.crypto?.subtle) return Promise.reject(new Error('Offline storage needs HTTPS and a browser with local storage enabled.'))
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ibfs-offline-v1', 1)
    request.onupgradeneeded = () => { request.result.createObjectStore('config'); request.result.createObjectStore('files', { keyPath: 'id' }) }
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
    request.onerror = () => reject(new Error('Could not open offline storage. Check browser storage permissions.'))
    request.onblocked = () => reject(new Error('Close other IBFS tabs and retry offline storage.'))
  })
}
async function read<T>(store: string, key?: string): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const request = key === undefined ? tx.objectStore(store).getAll() : tx.objectStore(store).get(key)
    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => reject(new Error('Could not read offline storage.'))
    tx.oncomplete = () => db.close(); tx.onabort = () => { db.close(); reject(new Error('Offline read interrupted.')) }
  })
}
export async function getVaultConfig() { return (await read<VaultConfig | undefined>('config', 'vault')) ?? null }
async function derive(password: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310_000 }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
async function encrypt(key: CryptoKey, data: ArrayBuffer, aad: string): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  return { iv, data: await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(aad) }, key, data) }
}
async function decrypt(key: CryptoKey, value: Envelope, aad: string) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: value.iv, additionalData: encoder.encode(aad) }, key, value.data) }
export async function setupVault(owner: string, password: string) {
  if (clearing) await clearing
  if (!owner) throw new Error('Sign in online before enabling offline storage.')
  if (password.length < 8) throw new Error('Use an offline password with at least 8 characters.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await derive(password, salt)
  const id = crypto.randomUUID()
  const config: VaultConfig = { id, owner, salt, verifier: await encrypt(key, encoder.encode('ibfs-offline-v1').buffer, id) }
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('config', 'readwrite')
    const store = tx.objectStore('config'); const request = store.get('vault')
    request.onsuccess = () => { if (request.result) tx.abort(); else store.put(config, 'vault') }
    tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = () => { db.close(); reject(new Error('Offline storage is already set up. Unlock it or clear it first.')) }
  })
  active = { config, key }; connect(); announce()
  return config
}
export async function unlockVault(password: string, owner?: string | null) {
  const config = await getVaultConfig()
  if (!config) throw new Error('Set up offline storage first.')
  if (owner && owner !== config.owner) throw new Error('These files belong to another login. Clear this device’s offline storage before setting up your account.')
  const key = await derive(password, config.salt)
  try { if (decoder.decode(await decrypt(key, config.verifier, config.id)) !== 'ibfs-offline-v1') throw new Error() }
  catch { throw new Error('Offline password is incorrect, or storage is damaged.') }
  active = { config, key }; connect(); announce()
}
function unlocked(owner?: string | null) {
  if (!active) throw new Error('Unlock offline storage first.')
  if (owner && owner !== active.config.owner) throw new Error('Offline storage belongs to another login.')
  return active
}
export async function saveOffline(meta: Omit<SavedMeta, 'id' | 'savedAt'>, body: Blob, owner?: string | null, existingId?: string) {
  const session = unlocked(owner)
  if (body.size > 50 * 1024 * 1024) throw new Error('This file exceeds the 50 MB offline limit. Download it instead.')
  const id = existingId || crypto.randomUUID()
  const details: SavedMeta = { ...meta, id, savedAt: new Date().toISOString() }
  const file: SavedFile = { id, meta: await encrypt(session.key, encoder.encode(JSON.stringify(details)).buffer, `${session.config.id}:${id}:meta`), body: await encrypt(session.key, await body.arrayBuffer(), `${session.config.id}:${id}:body`) }
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['config', 'files'], 'readwrite')
    const check = tx.objectStore('config').get('vault')
    check.onsuccess = () => { if (active !== session || check.result?.id !== session.config.id) tx.abort(); else tx.objectStore('files').put(file) }
    tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = () => { db.close(); reject(new Error('Could not save offline. Storage may be full or locked. Download a copy and retry.')) }
  })
  announce(); return details
}
export async function listOffline() {
  const session = unlocked(); const files = await read<SavedFile[]>('files')
  const result = await Promise.all(files.map(async file => JSON.parse(decoder.decode(await decrypt(session.key, file.meta, `${session.config.id}:${file.id}:meta`))) as SavedMeta))
  if (active !== session) throw new Error('Offline storage locked.')
  return result.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}
export async function loadOffline(id: string, owner?: string | null) {
  const session = unlocked(owner); const file = await read<SavedFile | undefined>('files', id)
  if (!file) throw new Error('This saved file was removed.')
  const meta = JSON.parse(decoder.decode(await decrypt(session.key, file.meta, `${session.config.id}:${id}:meta`))) as SavedMeta
  const body = await decrypt(session.key, file.body, `${session.config.id}:${id}:body`)
  if (active !== session) throw new Error('Offline storage locked.')
  return { meta, blob: new Blob([body], { type: meta.kind === 'pdf' ? 'application/pdf' : 'application/json' }) }
}
export async function deleteOffline(id: string) {
  unlocked(); const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(id)
    tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = () => { db.close(); reject(new Error('Could not remove saved file.')) }
  }); announce()
}
export function clearOffline(): Promise<void> {
  if (clearing) return clearing
  lockVault()
  clearing = (async () => {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['config', 'files'], 'readwrite'); tx.objectStore('config').clear(); tx.objectStore('files').clear()
      tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = () => { db.close(); reject(new Error('Could not clear offline storage.')) }
    }); announce()
  })().finally(() => { clearing = null })
  return clearing
}
