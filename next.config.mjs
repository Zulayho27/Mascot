// STATIC_EXPORT=1 builds a static, server-less preview (AI falls back to the offline demo facilitator).
const isStatic = process.env.STATIC_EXPORT === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isStatic ? { output: "export", images: { unoptimized: true } } : {}),
};

export default nextConfig;
