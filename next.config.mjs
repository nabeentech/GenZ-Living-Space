/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      }
    ],
  },
  // Next.js 14 external packages for server components (pdfkit uses native/fs assets)
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
