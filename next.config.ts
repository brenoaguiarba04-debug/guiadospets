import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: '**.petz.com.br' },
      { protocol: 'https', hostname: '**.cobasi.com.br' },
      { protocol: 'https', hostname: '**.cobasi.vteximg.com.br' },
      { protocol: 'https', hostname: '**.petlove.com.br' },
      { protocol: 'https', hostname: '**.amazon.com.br' },
      { protocol: 'https', hostname: '**.ssl-images-amazon.com' },
      { protocol: 'https', hostname: '**.media-amazon.com' },
      { protocol: 'https', hostname: '**.mercadolivre.com.br' },
      { protocol: 'https', hostname: 'http2.mlstatic.com' },
      { protocol: 'https', hostname: '**.magazineluiza.com.br' },
      { protocol: 'https', hostname: 'a-static.mlcdn.com.br' },
      { protocol: 'https', hostname: 'cf.shopee.com.br' },
      { protocol: 'https', hostname: '**' }, // Keep wildcard as fallback if needed for dev
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizeCss: true,
  },
  compress: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ],
};

export default nextConfig;
