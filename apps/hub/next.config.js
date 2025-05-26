/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@justsplit/shared-types',
    '@justsplit/firebase-config',
    '@justsplit/ui-components'
  ],
  images: {
    domains: ['lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
  },
}

module.exports = nextConfig