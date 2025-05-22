// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'giveagift-assets.nyc3.cdn.digitaloceanspaces.com',
        // Ensure this one is for your general assets, CDN might be different than direct Spaces endpoint
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
        hostname: 'graph.facebook.com', // Keep if you use Facebook login
      },
      // This pattern should match the hostname formed by your bucket and endpoint
      // For example, if DO_SPACES_BUCKET="mybucket" and DO_SPACES_ENDPOINT="nyc3.digitaloceanspaces.com"
      // the hostname will be "mybucket.nyc3.digitaloceanspaces.com"
      {
        protocol: 'https',
        hostname: `${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT.replace(/^https?:\/\//, '').split('/')[0]}`,
      }
      // If you have a CDN in front of your Spaces that has a different hostname like the first entry,
      // ensure both the direct Spaces endpoint (for uploads) and the CDN endpoint (for serving) are covered if they differ.
      // If DO_SPACES_ENDPOINT is the CDN itself (e.g., *.cdn.digitaloceanspaces.com) and your bucket is part of that,
      // then one entry might suffice.
      // Example: if endpoint is `nyc3.cdn.digitaloceanspaces.com` and bucket is `giveagift-assets`
      // resulting in `giveagift-assets.nyc3.cdn.digitaloceanspaces.com` then the first entry already covers it.
      // The key is that the `hostname` in remotePatterns must exactly match the hostname part of the image URL.
    ],
  },
};

module.exports = nextConfig;