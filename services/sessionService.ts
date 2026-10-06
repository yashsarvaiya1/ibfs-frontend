import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
interface Session { authenticated:boolean; username:string | null; csrf_token:string }
export const sessionService = {
  status:async()=>{
    const {data}=await api.get<Session>('/session/status/')
    useAuthStore.getState().setCsrfToken(data.csrf_token)
    return data
  },
  login:async(username:string,password:string)=>{
    await sessionService.status()
    const {data}=await api.post<Session>('/session/login/',{username,password})
    useAuthStore.getState().login(data.username!,data.csrf_token)
    return data
  },
  logout:async()=>{await api.post('/session/logout/');useAuthStore.getState().logout()},
}
