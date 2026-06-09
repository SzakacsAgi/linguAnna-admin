/** @type {import('next').NextConfig} */
const enableMacalyTagger =
  process.env.MACALY_TAGGER === "1" ||
  process.env.MACALY_TAGGER === "true" ||
  process.env.MACALY_TAGGER === "TRUE";

const nextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
    browserDebugInfoInTerminal: true,
  },
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  devIndicators: false,
  allowedDevOrigins: [
    "*.macaly.dev",
    "*.macaly.app",
    "*.macaly-app.com",
    "*.macaly-user-data.dev",
  ],
  turbopack: {
    rules: enableMacalyTagger
      ? {
          "*.{jsx,tsx}": {
            condition: {
              all: [{ not: "foreign" }, "development"],
            },
            loaders: [
              {
                loader: "macaly-tagger",
                options: {
                  disableSourceMaps: true,
                },
              },
            ],
            as: "*",
          },
        }
      : {},
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && enableMacalyTagger) {
      config.module.rules.unshift({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "macaly-tagger",
          },
        ],
        enforce: "pre",
      });
    }

    return config;
  },
};

module.exports = nextConfig;
