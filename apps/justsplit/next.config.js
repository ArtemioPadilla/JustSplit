/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@justsplit/shared-types',
    '@justsplit/firebase-config',
    '@justsplit/ui-components'
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
}

module.exports = nextConfig
