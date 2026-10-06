/// <reference lib="webworker" />
// app/sw.ts

import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist, NetworkOnly } from 'serwist'

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[]
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: { entries: [{ url: '/offline', matcher: ({request}) => request.destination === 'document' && !new URL(request.url).pathname.startsWith('/api/') && !new URL(request.url).pathname.startsWith('/media/') }] },
  runtimeCaching: [{ matcher: ({url,request}) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/') || request.headers.has('authorization'), handler: new NetworkOnly() }, ...defaultCache],
})

serwist.addEventListeners()

// Remove runtime caches left by the previous worker's general API caching rule.
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>['apis','others','others-cache','pages','cross-origin','next-data'].includes(key)).map(key=>caches.delete(key))))
))
