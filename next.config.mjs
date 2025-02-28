module.exports = {
    webpack: (config) => {
      config.module = {
        ...config.module,
        exprContextCritical: false, // Suppress critical dependency warnings
      };
      return config;
    },
  };