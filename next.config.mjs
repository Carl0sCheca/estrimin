/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.output.publicPath = "";
    }
    return config;
  },
};

export default nextConfig;
