/** @type {import('next').NextConfig} */
const nextConfig = {
    // Removed 'output: export' to enable server-side features (middleware, API routes)
    // Removed custom distDir to use default .next directory

    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },

    // Headers configuration for CORS and security
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: '*' }, // Adjust in production
                    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
                ],
            },
        ];
    },

    // Rewrites for subdomain handling (optional - middleware handles this)
    async rewrites() {
        return {
            beforeFiles: [],
            afterFiles: [],
            fallback: [],
        };
    },
};

export default nextConfig;
