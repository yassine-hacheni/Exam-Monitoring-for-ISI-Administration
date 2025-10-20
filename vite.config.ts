import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),

  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ✅ Configuration CRITIQUE pour Electron
  base: './', // Utilise des chemins relatifs

  // ✅ Configuration de build optimisée pour Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,

    // ✅ Important pour le routage SPA dans Electron
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        // ✅ Utiliser des noms de fichier stables pour Electron
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // ✅ Désactiver le code splitting trop agressif pour Electron
    chunkSizeWarningLimit: 1000,
  },

  // ✅ Configuration du serveur de développement
  server: {
    port: 5173,
    strictPort: true,
    host: true, // Permet l'accès depuis l'extérieur
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },

  // ✅ Configuration de preview pour tester le build de production
  preview: {
    port: 4173,
    host: true,
  },

  // ✅ Optimisations des dépendances
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-router'],
    exclude: ['@tanstack/router-devtools'],
  },

  // ✅ Désactiver les fonctionnalités qui peuvent causer des problèmes dans Electron
  define: {
    'process.env': {},
  },
})