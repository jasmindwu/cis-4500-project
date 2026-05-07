import { initializeApp, getApps } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'

/**
 * Vite env vars — copy client/.env.example to client/.env and fill from Firebase Console → Project settings → Your apps.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
if (measurementId) {
  firebaseConfig.measurementId = measurementId
}

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

let appSingleton = null
let authSingleton = null
let analyticsInitStarted = false

function ensureApp() {
  if (!isFirebaseConfigured()) return null
  if (!appSingleton) {
    appSingleton = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    if (typeof window !== 'undefined' && firebaseConfig.measurementId && !analyticsInitStarted) {
      analyticsInitStarted = true
      void isSupported().then((supported) => {
        if (supported) getAnalytics(appSingleton)
      })
    }
  }
  return appSingleton
}

/** Returns Firebase Auth or null if env vars are missing (dev-friendly). */
export function getFirebaseAuth() {
  const app = ensureApp()
  if (!app) return null
  if (!authSingleton) authSingleton = getAuth(app)
  return authSingleton
}
