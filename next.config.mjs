/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/s3-images/:path*",
        destination:
          "https://comfy-deploy-output.s3.us-east-2.amazonaws.com/:path*",
      },
    ];
  },
};

export default nextConfig;
