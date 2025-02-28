// next.config.js
module.exports = {
  webpack: (config) => {
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };
    return config;
  },
};