/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/shared'],
  serverExternalPackages: ['@anthropic-ai/sdk', 'openai'],
};

export default nextConfig;
