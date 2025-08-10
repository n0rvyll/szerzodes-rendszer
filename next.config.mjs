// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Ha valahol pdf.js-re esne vissza, irányítsuk az ESM-re:
      'pdfjs-dist/build/pdf': 'pdfjs-dist/build/pdf.mjs',
      'pdfjs-dist': 'pdfjs-dist/build/pdf.mjs',
    };
    return config;
  },
};

export default nextConfig;
