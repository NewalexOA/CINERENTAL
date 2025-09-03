import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = command === 'serve'
  const enableBundleAnalyzer = env.VITE_BUNDLE_ANALYZER === 'true'

  return {
    plugins: [
      vue(),
      vueDevTools(),
      // Bundle analyzer plugin with proper ES module import
      ...(enableBundleAnalyzer ? [
        visualizer({
          filename: 'dist/bundle-report.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
          template: 'sunburst', // Better for hierarchical chunk visualization
          title: 'CINERENTAL Bundle Analysis',
          sourcemap: true,
          projectRoot: process.cwd(),
          // Enhanced analysis options
          emitFile: true,
        }),
      ] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    build: {
      // Stricter performance budgets and warnings
      chunkSizeWarningLimit: 500, // Reduced from 1000KB

      // Performance budgets enforcement
      reportCompressedSize: true,
      assetsInlineLimit: 4096, // Inline assets under 4KB

      // Advanced rollup options for optimized bundle splitting
      rollupOptions: {
        // Multiple entry points for better optimization
        input: {
          main: './index.html',
        },

        // Tree shaking optimizations
        treeshake: {
          preset: 'recommended',
          manualPureFunctions: ['console.log', 'console.warn'], // Remove console in production
          moduleSideEffects: false, // Aggressive tree shaking
        },

        output: {
          // Enhanced manual chunks for better performance with priority-based loading
          manualChunks: (id) => {
            // Critical vendor chunks (loaded early, highest cache priority)
            if (id.includes('node_modules/vue/') && !id.includes('vue-router') && !id.includes('pinia')) {
              return 'vue-core' // Separate Vue core for better caching
            }

            if (id.includes('node_modules/vue-router') ||
                id.includes('node_modules/pinia')) {
              return 'vue-ecosystem' // Router + state management
            }

            // Heavy utility libraries (lazy loaded with caching)
            if (id.includes('node_modules/lodash') ||
                id.includes('node_modules/lodash-es')) {
              return 'utils-lodash'
            }

            if (id.includes('node_modules/@tanstack/vue-virtual')) {
              return 'virtualization' // Heavy virtual scrolling lib
            }

            if (id.includes('node_modules/axios')) {
              return 'http-client'
            }

            // UI libraries (can be cached separately, medium priority)
            if (id.includes('node_modules/tailwindcss') ||
                id.includes('node_modules/autoprefixer') ||
                id.includes('node_modules/postcss')) {
              return 'css-processing'
            }

            // Performance monitoring utilities (lazy loaded)
            if (id.includes('/utils/performance') ||
                id.includes('/composables/usePerformance') ||
                id.includes('/composables/useAsyncComponents')) {
              return 'performance-utils'
            }

            // Feature-based chunks with priority optimization

            // Critical components (loaded early)
            if (id.includes('/components/common/') ||
                id.includes('/components/layout/')) {
              return 'core-components'
            }

            // Equipment module (high priority)
            if (id.includes('/components/equipment/') ||
                id.includes('/views/Equipment') ||
                id.includes('/stores/equipment') ||
                id.includes('/composables/useEquipment')) {
              return 'equipment-module'
            }

            // Cart system (medium priority)
            if (id.includes('/components/cart/') ||
                id.includes('/stores/cart') ||
                id.includes('/composables/useCart')) {
              return 'cart-system'
            }

            // Virtual scrolling (heavy, lazy load)
            if (id.includes('/components/demo/VirtualScrolling') ||
                id.includes('/components/projects/Virtual') ||
                id.includes('/components/equipment/Virtual')) {
              return 'virtual-components'
            }

            // Projects module (medium priority)
            if (id.includes('/components/projects/') ||
                id.includes('/views/Project') ||
                id.includes('/stores/project')) {
              return 'projects-module'
            }

            // Scanner functionality (low priority, specialized use, on-demand)
            if (id.includes('/components/scanner/') ||
                id.includes('/views/Scanner') ||
                id.includes('/composables/useScanner')) {
              return 'scanner-module'
            }

            // Admin features (low priority, role-based loading)
            if (id.includes('/views/Clients') ||
                id.includes('/views/Bookings') ||
                id.includes('/stores/clients') ||
                id.includes('/stores/bookings')) {
              return 'admin-module'
            }

            // Demo components (development only, excluded in production)
            if (id.includes('/components/demo/') ||
                id.includes('/views/CartDemo')) {
              return 'demo-components'
            }

            // Async component utilities and error boundaries
            if (id.includes('/components/async/') ||
                id.includes('/components/common/ErrorBoundary') ||
                id.includes('/components/common/Suspense')) {
              return 'async-utilities'
            }

            // Route-specific lazy loading optimizations
            if (id.includes('/views/Dashboard')) {
              return 'dashboard-module' // High priority, preloaded
            }

            // Form and validation utilities (medium priority)
            if (id.includes('/components/forms/') ||
                id.includes('/composables/useValidation') ||
                id.includes('/utils/validation')) {
              return 'forms-validation'
            }

            // Other vendor libraries
            if (id.includes('node_modules')) {
              return 'vendor-misc'
            }
          },

          // Optimized chunk naming with size info in dev
          chunkFileNames: (chunkInfo) => {
            if (isDev) {
              // Include estimated size info in dev for debugging
              return `js/[name]-[hash].js`
            }
            return `js/[name]-[hash:8].js` // Shorter hash in production
          },

          entryFileNames: isDev ? 'js/[name].js' : 'js/[name]-[hash:8].js',

          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') ?? []
            const ext = info[info.length - 1]

            // Optimize asset naming for better caching
            const hash = isDev ? '' : '-[hash:8]'

            if (/\.(css)$/.test(assetInfo.name ?? '')) {
              return `css/[name]${hash}.[ext]`
            }
            if (/\.(png|jpe?g|gif|svg|webp|webm|mp4)$/.test(assetInfo.name ?? '')) {
              return `assets/[name]${hash}.[ext]`
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name ?? '')) {
              return `fonts/[name]${hash}.[ext]`
            }
            return `assets/[name]${hash}.[ext]`
          },
        },

        // Remove deprecated experimentalMinChunkSize option
        // Small chunks are now handled by manualChunks strategy above

        // Optimize chunking strategy for better caching
        external: [], // Let bundler handle all dependencies for better tree shaking

        // Advanced output optimization
        onwarn(warning, warn) {
          // Suppress circular dependency warnings for Vue ecosystem
          if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.importer?.includes('node_modules')) {
            return
          }
          // Suppress eval warnings from development tools
          if (warning.code === 'EVAL' && warning.id?.includes('node_modules')) {
            return
          }
          warn(warning)
        }
      },

      // Source map configuration (enable for bundle analysis)
      sourcemap: isDev || enableBundleAnalyzer,
      // Minification options
      minify: !isDev,
      // Target modern browsers for better optimization
      target: 'es2020',
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://web:8000',
          changeOrigin: true,
          secure: false,
        }
      }
    },

    // Enhanced dependency optimization with caching strategies
    optimizeDeps: {
      include: [
        // Critical dependencies (always pre-bundle, highest priority)
        'vue',
        'vue-router',
        'pinia',
        'axios',

        // Heavy libraries (pre-bundle for faster dev)
        '@tanstack/vue-virtual',

        // Common utilities (selective inclusion to reduce bundle size)
        'lodash-es/debounce',
        'lodash-es/throttle',
        'lodash-es/cloneDeep',
        'lodash-es/merge',
        'lodash-es/omit',
        'lodash-es/pick',
      ],
      exclude: [
        '@vite/client',
        '@vite/env',
        // Exclude large libraries that are better lazy-loaded
        'lodash-es', // Use selective imports instead
        // Exclude development-only dependencies from production optimization
        ...(isDev ? [] : ['vitest', 'vite-plugin-vue-devtools']),
      ],

      // Force optimization for problematic packages with better caching
      force: isDev ? [] : ['vue', '@tanstack/vue-virtual', 'axios'],

      // Enhanced dependency optimization for better tree shaking and performance
      esbuildOptions: {
        target: 'es2020',
        treeShaking: true,
        minifySyntax: !isDev,
        minifyWhitespace: !isDev,
        // Advanced optimization flags
        legalComments: isDev ? 'inline' : 'none',
        keepNames: isDev, // Keep function names in development
        // Platform-specific optimizations
        platform: 'browser',
        format: 'esm',
        splitting: true,
      },

      // Optimize dependency loading order
      entries: [
        './src/main.ts',
        './src/router/index.ts',
        './src/utils/performance.ts',
      ]
    },

    // Additional build performance settings
    esbuild: {
      target: 'es2020',
      // Remove console/debugger in production
      drop: isDev ? [] : ['console', 'debugger'],
      // Pure function annotations for better tree shaking
      pure: ['console.log', 'console.warn'],
    },
  }
})
