// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
      domains: ['giveagift-assets.nyc3.cdn.digitaloceanspaces.com', 'nyc3.digitaloceanspaces.com', 'm.media-amazon.com'],
    },
  };
  
  module.exports = nextConfig;