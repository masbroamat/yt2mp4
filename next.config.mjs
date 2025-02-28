/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      if (isServer) {
        config.externals = config.externals || [];
        // Tell webpack to treat the linux-x64 FFmpeg binary as an external dependency:
        config.externals.push({
          '@ffmpeg-installer/linux-x64': 'commonjs2 @ffmpeg-installer/linux-x64',
        });
      }
      return config;
    },
  };
  
  export default nextConfig;
  