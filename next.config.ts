// next.config.ts

import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development', // skip SW in dev
})

const nextConfig: NextConfig = {
  turbopack: {}, // ← silences the turbopack warning
}

export default withSerwist(nextConfig)
