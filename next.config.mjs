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
  // Prevent webpack bundling pdfkit since it relies on file system assets
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
