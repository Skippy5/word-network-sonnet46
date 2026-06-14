/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — all processing is client-side, so this works cleanly.
  // Toggle to 'standalone' for Docker/Node-server deployment.
  // output: 'export',

  // Next.js 16 uses Turbopack by default. Empty turbopack config = use it with defaults.
  // (graphology/force-graph work fine without webpack customisation in Turbopack)
  turbopack: {},
};

export default nextConfig;
