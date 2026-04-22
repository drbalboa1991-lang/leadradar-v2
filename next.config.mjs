/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure the raw landing HTML template is bundled for Vercel's file tracer.
  outputFileTracingIncludes: {
    '/': ['./app/landing.html'],
  },
};

export default nextConfig;
