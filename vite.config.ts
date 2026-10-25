import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_SPOTIFY_');
  const endpoint = env.VITE_SPOTIFY_ENDPOINT;
  // Development-only fixed route for the public metadata endpoint. No tokens,
  // arbitrary destination, cookies, or authorization headers are forwarded.
  const spotify = endpoint && /^https:\/\/[^/]+\.workers\.dev\/v1\/recent$/.test(endpoint) ? new URL(endpoint) : undefined;
  return {
    plugins: [reactRouter()],
    server: {
      proxy: spotify ? {
        '^/__spotify/(recent|color/[a-zA-Z0-9]{22})$': {
          target: spotify.origin,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/__spotify\//, '/v1/'),
          headers: { Origin: 'https://felipesatr.github.io' },
          configure: proxy => {
            proxy.on('proxyReq', request => {
              request.removeHeader('cookie');
              request.removeHeader('authorization');
            });
          },
        },
      } : undefined,
    },
    resolve: {
      tsconfigPaths: true,
    },
  };
});
