/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  // Only use relative asset prefix in production builds
  assetPrefix: process.env.NODE_ENV === 'production' ? '.' : '',
  basePath: '',
};

module.exports = nextConfig;