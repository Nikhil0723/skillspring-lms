import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiOrigin = process.env.API_PROXY_ORIGIN?.replace(/\/$/, "");
    if (!apiOrigin) return [];

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiOrigin}/socket.io/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
