/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      if (isServer) {
        // Exclude the Windows FFmpeg installer module from bundling.
        config.externals = config.externals || [];
        config.externals.push({
          '@ffmpeg-installer/win32-x64': 'commonjs2 @ffmpeg-installer/win32-x64',
        });
        // (Optionally, add others if you target multiple OSes)
        // config.externals.push({
        //   '@ffmpeg-installer/darwin-x64': 'commonjs2 @ffmpeg-installer/darwin-x64',
        // });
      }
      return config;
    },
  };
  
  export default nextConfig;
  