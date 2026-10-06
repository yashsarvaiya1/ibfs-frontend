import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
const withSerwist=withSerwistInit({reloadOnOnline:false,additionalPrecacheEntries:[{url:'/offline',revision:crypto.randomUUID()}],swSrc:'app/sw.ts',swDest:'public/sw.js',disable:process.env.NODE_ENV==='development'})
const nextConfig:NextConfig={
  output:'standalone',
  skipTrailingSlashRedirect:true,
  turbopack:{},
  // Uploaded private images are fetched by the user's authenticated browser.
  images:{unoptimized:true},
}
export default withSerwist(nextConfig)
