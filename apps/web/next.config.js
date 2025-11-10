/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@perrache/types'],
  typedRoutes: true
}

module.exports = nextConfig
