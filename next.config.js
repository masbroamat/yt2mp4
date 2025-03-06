// next.config.js
module.exports = {
  devIndicators: false, // disables dev indicators
  webpack: (config) => {
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };
    return config;
  },
};
