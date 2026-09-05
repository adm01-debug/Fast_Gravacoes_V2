import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 8080,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && visualizer({
      filename: 'dist/bundle-report.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      sourcemap: false,
      title: 'Fast Gravações — Bundle Report',
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['debugger'] : [],
    pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
    legalComments: 'none',
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // React Core
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          // Core Utilities
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('@supabase/')) return 'vendor-supabase';
          if (id.includes('/lucide-react/')) return 'vendor-icons';
          if (id.includes('/framer-motion/') || id.includes('/motion-')) return 'vendor-motion';
          if (id.includes('@radix-ui/')) return 'vendor-radix';

          // ── Visualization Stack (Critical: Keep together to avoid TDZ) ──
          // Recharts and its dependencies are prone to circular references
          // when split. We group them with their specific utilities.
          if (
            id.includes('/recharts/') ||
            id.includes('/d3') || 
            id.includes('/victory-vendor/') ||
            id.includes('/react-smooth/') ||
            id.includes('/internmap/') ||
            id.includes('/fast-equals/') ||
            id.includes('/eventemitter3/') ||
            id.includes('/decimal.js-light/') ||
            id.includes('/react-transition-group/') ||
            id.includes('/prop-types/') ||
            id.includes('/react-is/') ||
            id.includes('/lodash') // Both lodash and lodash-es
          ) {
            return 'lib-charts';
          }

          // Other Heavy Libs
          if (id.includes('/mermaid/') || id.includes('/cytoscape')) return 'lib-mermaid';
          if (id.includes('/exceljs/') || id.includes('/jszip/') || id.includes('/file-saver/')) return 'lib-excel';
          if (id.includes('/jspdf')) return 'lib-pdf';
          if (id.includes('/html2canvas/')) return 'lib-html2canvas';
          if (id.includes('/html5-qrcode/') || id.includes('/qrcode.react/')) return 'lib-qrcode';
          if (id.includes('/react-joyride/') || id.includes('/react-floater/')) return 'lib-joyride';
          if (id.includes('/react-markdown/') || id.includes('/remark-') || id.includes('/micromark') || id.includes('/mdast') || id.includes('/unified/')) return 'lib-markdown';

          // General Utilities
          if (
            id.includes('/date-fns/') || 
            id.includes('/clsx/') || 
            id.includes('/tailwind-merge/') || 
            id.includes('/class-variance-authority/') ||
            id.includes('/zod/') ||
            id.includes('/react-hook-form/')
          ) {
            return 'vendor-utils';
          }

          if (id.includes('/@dnd-kit/')) return 'vendor-dnd';
          if (id.includes('@sentry/')) return 'vendor-sentry';

          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'recharts',
      'clsx',
      'tailwind-merge',
      'dayjs',
      '@braintree/sanitize-url',
    ],
    exclude: ['mermaid', 'exceljs', 'jspdf', 'html2canvas'],
  },
}));
