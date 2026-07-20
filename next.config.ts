import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/book-online",
        destination: "/devis",
        permanent: true,
      },
      {
        source: "/a-propos-de-nous",
        destination: "/",
        permanent: true,
      },
      {
        source: "/mentions-légales",
        destination: "/mentions-legales",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
