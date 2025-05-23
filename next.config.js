// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'giveagift-assets.nyc3.cdn.digitaloceanspaces.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
      },
      {
        protocol: 'https',
        hostname: `${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT.replace(/^https?:\/\//, '').split('/')[0]}`,
      },
      {
        protocol: 'https',
        hostname: 'nyc3.digitaloceanspaces.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for 'net', 'tls', 'fs' module not found with mysql2 or other server-side libs
    if (!isServer) {
      // For client-side bundle, make these Node.js modules effectively empty
      // or tell Webpack they are external and will be provided (which they won't be in browser).
      // Aliasing to `false` is often more effective for complete exclusion.
      config.resolve.alias = {
        ...config.resolve.alias,
        net: false,
        tls: false,
        fs: false,
        // You might also need to add 'mysql2' itself here if problems persist with it
        // 'mysql2': false, // Uncomment this as a last resort if 'net' issues within mysql2 persist
      };

      // The externals approach:
      // const existingExternals = Array.isArray(config.externals) ? config.externals : [];
      // config.externals = [
      //   ...existingExternals,
      //   {
      //     net: 'net',
      //     tls: 'tls',
      //     fs: 'fs',
      //   },
      // ];
    }

    return config;
  },
};

module.exports = nextConfig;