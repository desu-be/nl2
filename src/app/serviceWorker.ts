/**
 * Registers public/sw.js in production builds only: it makes the app installable and keeps the last
 * loaded version available. The dev server must never be cached.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
    console.warn('Service worker registration failed', error);
  });
}
