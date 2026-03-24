import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc:   'app/sw.ts',
  swDest:  'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

// Strip /api suffix if present to get base origin
const DJANGO_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '')

const nextConfig: NextConfig = {
  turbopack: {},

  async rewrites() {
    return [
      {
        source:      '/api/:path*',
        destination: `${DJANGO_ORIGIN}/api/:path*`,
      },
      {
        source:      '/media/:path*',
        destination: `${DJANGO_ORIGIN}/media/:path*`,
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
  },
}

export default withSerwist(nextConfig)
