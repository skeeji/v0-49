/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
  // Augmenter les timeouts pour les gros imports
  serverRuntimeConfig: {
    maxDuration: 300, // 5 minutes
  },
}

export default nextConfig
