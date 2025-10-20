// src/main.tsx
import { StrictMode, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  RouterProvider,
  createRouter,
  Router,
  createHashHistory, // ✅ AJOUTEZ CETTE LIGNE
} from '@tanstack/react-router'
import { toast } from 'sonner'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
import { PinLock } from './components/pinlock'
import { routeTree } from './routeTree.gen'
import './styles/index.css'

// ✅ Configuration du QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 1000,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        const status = error.response?.status
        if (status === 401) {
          toast.error('Session expirée !')
        } else if (status === 500) {
          toast.error('Erreur interne du serveur !')
        } else {
          toast.error('Erreur réseau ou requête échouée.')
        }
      } else {
        console.error('Unexpected error in query:', error)
      }
    },
  }),
})

// ✅ Création du hash history pour Electron
const hashHistory = createHashHistory()

// ✅ Création sécurisée du router avec hash history
let router: Router | null = null
try {
  router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    history: hashHistory, // ✅ AJOUTEZ CETTE LIGNE
  })
} catch (error) {
  console.error('Erreur de création du router :', error)
}

// ✅ Typage global pour le router (nécessaire uniquement si TypeScript est actif)
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// ✅ Spinner de chargement
function LoadingSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">
          Chargement de l'application...
        </p>
      </div>
    </div>
  )
}

// ✅ Composant principal
function Main() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100))
        const unlocked = sessionStorage.getItem('app_unlocked') === 'true'
        setIsUnlocked(unlocked)
      } catch (error) {
        console.error('Initialization error:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    initializeApp()
  }, [])

  const handleUnlock = () => {
    try {
      sessionStorage.setItem('app_unlocked', 'true')
    } catch (error) {
      console.error('Error saving unlock state:', error)
    } finally {
      setIsUnlocked(true)
    }
  }

  if (!isInitialized) return <LoadingSpinner />

  if (!isUnlocked)
    return (
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <PinLock onUnlock={handleUnlock} />
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    )

  if (!router)
    return (
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <div className="flex h-screen w-full items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-destructive">
                  Erreur d'initialisation
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Impossible de démarrer l'application. Veuillez
                  rafraîchir la page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded bg-primary px-4 py-2 text-white"
                >
                  Rafraîchir
                </button>
              </div>
            </div>
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <RouterProvider router={router} />
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

// ✅ Point d'entrée
function App() {
  return (
    <StrictMode>
      <Main />
    </StrictMode>
  )
}

// ✅ Rendu racine
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element (#root) not found in DOM')
} else {
  try {
    const root = ReactDOM.createRoot(rootElement)
    root.render(<App />)
  } catch (error) {
    console.error('Error rendering app:', error)
    rootElement.innerHTML = `
      <div style="display: flex; height: 100vh; align-items: center; justify-content: center; flex-direction: column; font-family: system-ui;">
        <h1 style="color: #ef4444; margin-bottom: 1rem;">Erreur de l'application</h1>
        <p style="color: #6b7280; margin-bottom: 1rem;">Impossible de démarrer l'application.</p>
        <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;">
          Rafraîchir
        </button>
      </div>
    `
  }
}