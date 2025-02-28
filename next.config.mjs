/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      if (isServer) {
        config.externals = config.externals || [];
        // Exclude all @ffmpeg-installer packages from bundling
        config.externals.push(/^@ffmpeg-installer\/.*/);
      }
      return config;
    },
  };
  
  export default nextConfig;