/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export', // REMOVE this line for Firebase Next.js integration
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
