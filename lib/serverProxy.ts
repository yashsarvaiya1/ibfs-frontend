import type { NextRequest } from 'next/server'

/** Resolve the Django origin at request time, so one image works in every environment. */
export async function proxyDjango(request:NextRequest, path:string[], prefix:'api'|'media') {
  const origin=process.env.DJANGO_ORIGIN || 'http://127.0.0.1:8000'
  const url=new URL(`/${prefix}/${path.map(encodeURIComponent).join('/')}${prefix==='api' ? '/' : ''}`,origin)
  url.search=request.nextUrl.search
  const headers=new Headers(request.headers)
  for(const name of ['host','connection','content-length','accept-encoding'])headers.delete(name)
  headers.set('X-Forwarded-Host',request.headers.get('host') || request.nextUrl.host)
  headers.set('X-Forwarded-Proto',request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':',''))
  try {
    const upstream=await fetch(url,{method:request.method,headers,
      body:['GET','HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect:'manual',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(90000)])})
    const responseHeaders=new Headers(upstream.headers)
    for(const name of ['content-encoding','content-length','connection','set-cookie'])responseHeaders.delete(name)
    for(const cookie of upstream.headers.getSetCookie())responseHeaders.append('set-cookie',cookie)
    responseHeaders.set('Cache-Control','private, no-store')
    const location=responseHeaders.get('location')
    if(location && location.startsWith(origin))responseHeaders.set('location',location.slice(origin.length))
    return new Response(upstream.body,{status:upstream.status,headers:responseHeaders})
  } catch {
    return Response.json({error:'The accounting server is unavailable. Please retry.'},{status:502,headers:{'Cache-Control':'no-store'}})
  }
}
