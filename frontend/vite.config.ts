import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory and its parent directories
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      // Visualize bundle size (only in production)
      mode === 'analyze' && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    
    // Base public path when served in production
    base: '/',
    
    // Development server configuration
    server: {
      port: 3000,
      open: true,
      cors: true,
      host: true, // Listen on all network interfaces
      // Proxy API requests in development
      proxy: {
        '/api': {
          target: 'http://localhost:5000', // Your API server
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production', // Disable source maps in production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Remove console.log in production
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            chakra: ['@chakra-ui/react', '@chakra-ui/icons', '@emotion/react', '@emotion/styled', 'framer-motion'],
            web3: ['@multiversx/sdk-dapp', '@multiversx/sdk-wallet', '@tanstack/react-query'],
          },
        },
      },
      chunkSizeWarningLimit: 1000, // Increase chunk size warning limit (in kbs)
    },
    
    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@components': resolve(__dirname, 'src/components'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@contexts': resolve(__dirname, 'src/contexts'),
        '@services': resolve(__dirname, 'src/services'),
        '@contracts': resolve(__dirname, '../contracts'),
      },
    },
    
    // Global CSS configuration
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            @import "@/styles/variables.scss";
            @import "@/styles/mixins.scss";
          `,
        },
      },
    },
    
    // Environment variables that should be exposed to the client
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '0.1.0'),
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
        VITE_APP_TITLE: JSON.stringify(env.VITE_APP_TITLE || 'MetaShipX'),
        VITE_APP_ENVIRONMENT: JSON.stringify(env.VITE_APP_ENVIRONMENT || 'development'),
      },
    },
  };
});
