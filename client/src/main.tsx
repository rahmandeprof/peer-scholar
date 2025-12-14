import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { initOfflineSync } from './lib/offlineReadingTracker'
import { initOfflineQuizSync } from './lib/offlineQuizStore'

// Initialize offline reading sync
initOfflineSync();

// Initialize offline quiz sync
initOfflineQuizSync();

// Handle dynamic import errors (stale chunks after deployment)
// When a deployment happens, old JS chunks are replaced with new ones
// Users with cached HTML may try to load non-existent old chunks
window.addEventListener('error', (event) => {
  // Check if it's a chunk loading error
  if (
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Loading chunk') ||
    event.message?.includes('ChunkLoadError')
  ) {
    console.warn('Detected stale chunk, reloading page...');
    // Clear service worker cache and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      });
    }
    // Force reload from server (bypass cache)
    window.location.reload();
  }
});

// Also handle unhandled promise rejections for dynamic imports
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
    event.reason?.message?.includes('Loading chunk') ||
    event.reason?.name === 'ChunkLoadError'
  ) {
    console.warn('Detected stale chunk in promise, reloading page...');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      });
    }
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
