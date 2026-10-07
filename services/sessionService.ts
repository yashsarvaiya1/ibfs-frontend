import api from '@/lib/axios'
import { clearOffline } from '@/lib/offline/vault'
import { useAuthStore } from '@/stores/authStore'
interface Session { authenticated: boolean; username: string | null; csrf_token: string }
const SESSION_TIMEOUT = 10000
let pendingStatus: Promise<Session> | null = null
let statusController: AbortController | null = null
let generation = 0

function cancelStatus() {
  generation++
  statusController?.abort()
  statusController = null
  pendingStatus = null
}

function csrfToken() {
  // Prefer Django's current cookie: login rotates it, including across tabs.
  const cookie = typeof document === 'undefined' ? undefined : document.cookie.split('; ').find(value => value.startsWith('csrftoken='))
  return cookie ? decodeURIComponent(cookie.slice('csrftoken='.length)) : useAuthStore.getState().csrfToken
}

export const sessionService = {
  status: () => {
    if (!pendingStatus) {
      const version = generation
      const revision = useAuthStore.getState().sessionRevision
      const controller = new AbortController()
      statusController = controller
      const request = api.get<Session>('/session/status/', { timeout: SESSION_TIMEOUT, signal: controller.signal })
        .then(({ data }) => {
          if (version !== generation || revision !== useAuthStore.getState().sessionRevision) throw new Error('Session check superseded')
          useAuthStore.getState().setCsrfToken(data.csrf_token)
          return data
        }).finally(() => {
          if (pendingStatus === request) { pendingStatus = null; statusController = null }
        })
      pendingStatus = request
    }
    return pendingStatus
  },
  login: async (username: string, password: string) => {
    cancelStatus()
    const version = generation
    const revision = useAuthStore.getState().sessionRevision
    // A fresh browser needs a CSRF cookie. Existing sessions can submit immediately.
    if (!csrfToken()) await sessionService.status()
    const { data } = await api.post<Session>('/session/login/', { username, password }, {
      timeout: SESSION_TIMEOUT, headers: { 'X-CSRFToken': csrfToken() },
    })
    if (version !== generation || revision !== useAuthStore.getState().sessionRevision) throw new Error('Sign-in superseded')
    cancelStatus()
    useAuthStore.getState().login(data.username!, data.csrf_token)
    return data
  },
  logout: async () => {
    const token = csrfToken()
    cancelStatus()
    // Lock the workspace immediately, even if the server cannot be reached.
    useAuthStore.getState().logout()
    const clearing = clearOffline().catch(() => { /* The vault is locked before storage deletion starts. */ })
    try {
      await api.post('/session/logout/', undefined, { timeout: SESSION_TIMEOUT, headers: { 'X-CSRFToken': token } })
    } finally {
      await clearing
    }
  },
}
