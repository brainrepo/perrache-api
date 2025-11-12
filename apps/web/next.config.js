/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@perrache/types'],
  typedRoutes: true,
  output: 'standalone'
}

module.exports = nextConfig
