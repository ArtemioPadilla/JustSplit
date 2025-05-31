/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@cybereco/shared-types',
    '@cybereco/firebase-config',
    '@cybereco/ui-components'
  ],
  images: {
    unoptimized: true,
    domains: ['lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
  },
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  eslint: {
    // Temporarily disable ESLint during builds
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
