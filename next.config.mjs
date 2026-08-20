/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    // Serve modern formats; browser picks the best it supports
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 1 year (CDN-friendly)
    minimumCacheTTL: 31536000,
    // Tighten device/image size steps to avoid generating unnecessary variants
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 192, 256],
  },
  compress: true,
  async headers() {
    return [
      {
        // Cache static assets (JS/CSS/fonts) for 1 year — hash-named so safe to bust on deploy
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Cache public branding assets for 1 week (not immutable — can change without hash)
        source: '/branding/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
    ];
  },
};

export default nextConfig;
