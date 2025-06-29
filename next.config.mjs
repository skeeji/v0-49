/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image-similarity-api-590690354412.us-central1.run.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
}

export default nextConfig
