/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'wow.zamimg.com' },
      { protocol: 'https', hostname: 'www.wowhead.com' },
      { protocol: 'https', hostname: 'wowhead.com' },
      { protocol: 'https', hostname: 'static.wikia.nocookie.net' }
    ]
  }
}

module.exports = nextConfig
