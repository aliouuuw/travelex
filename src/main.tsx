import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConvexClientProvider } from './components/convex-provider.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
          <ConvexClientProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </ConvexClientProvider>
  </StrictMode>,
)
