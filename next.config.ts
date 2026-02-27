import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const mediaHosts = (process.env.NEXT_PUBLIC_MEDIA_HOSTS ?? 'localhost:8000')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [hostname, port] = entry.split(':')
    return {
      protocol: (process.env.NEXT_PUBLIC_MEDIA_PROTOCOL ?? 'http') as 'http' | 'https',
      hostname,
      ...(port ? { port } : {}),
      pathname: '/media/**',
    }
  })

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      // Backend media (your Django server)
      ...mediaHosts,
      // Frontend self host (for any public/ images, fallback, etc.)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
  },
}

export default withSerwist(nextConfig)
