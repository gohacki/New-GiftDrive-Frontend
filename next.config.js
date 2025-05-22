// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'giveagift-assets.nyc3.cdn.digitaloceanspaces.com',
        // This is likely for your CDN-served assets
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
        hostname: 'lh3.googleusercontent.com', // For Google profile pictures
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com', // For Facebook profile pictures
      },
      // For profile pictures uploaded to Spaces (e.g., my-bucket.nyc3.digitaloceanspaces.com)
      {
        protocol: 'https',
        hostname: `${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT.replace(/^https?:\/\//, '').split('/')[0]}`,
      },
      // ADD THIS NEW PATTERN for URLs like: https://nyc3.digitaloceanspaces.com/your-bucket-name/path/to/image.png
      {
        protocol: 'https',
        hostname: 'nyc3.digitaloceanspaces.com', // Add the direct endpoint hostname
        // You might want to restrict the pathname if all images from this host follow a pattern
        // pathname: `/${process.env.DO_SPACES_BUCKET}/**`, // Example: allows /your-bucket-name/images/...
      },
    ],
  },
};

module.exports = nextConfig;