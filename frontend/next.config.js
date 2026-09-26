/** @type {import('next').NextConfig} */
const rawBackend =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api';

const backendApiBase = rawBackend.endsWith('/api')
  ? rawBackend
  : `${rawBackend}/api`;

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiBase}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

