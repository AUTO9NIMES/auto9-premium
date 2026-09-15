import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/result-duo.mp4",
        destination: "/api/service-video/duo",
        permanent: false,
      },
      {
        source: "/result-interieur.mp4",
        destination: "/api/service-video/interior",
        permanent: false,
      },
      {
        source: "/result-exterieur.mp4",
        destination: "/api/service-video/exterior",
        permanent: false,
      },
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
