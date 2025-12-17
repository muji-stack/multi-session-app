// Firebase configuration from environment variables
// Note: Firebase Auth requires browser APIs and cannot run in Electron main process directly.
// Authentication is handled in the renderer process instead.
// This file only stores configuration and provides helper functions.

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export function getFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || ''
  }
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig()
  return !!(config.apiKey && config.projectId)
}
