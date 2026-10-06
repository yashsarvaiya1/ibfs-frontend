import type { NextRequest } from 'next/server'
import { proxyDjango } from '@/lib/serverProxy'
export const dynamic='force-dynamic'
async function handle(request:NextRequest, context:{params:Promise<{path:string[]}>}) {
  return proxyDjango(request,(await context.params).path,'media')
}
export { handle as GET, handle as HEAD }
