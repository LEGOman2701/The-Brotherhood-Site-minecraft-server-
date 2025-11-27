// Firebase authentication setup for The Brotherhood
// Reference: firebase_barebones_javascript blueprint
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.appId
);

// Initialize Firebase app only if configured
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

// Google Provider
const googleProvider = new GoogleAuthProvider();

// Microsoft Provider for Outlook
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  prompt: 'select_account'
});

// Test user for development when Firebase is not configured
const testUser = {
  uid: "test-user-123",
  email: "test@example.com",
  displayName: "Test User",
  photoURL: null,
  getIdToken: async () => "test-token-development-only"
};

export async function signInWithGoogle() {
  if (!auth) {
    // For development/testing when Firebase is not configured
    if (import.meta.env.DEV) {
      console.warn("Firebase not configured - using test user for development");
      return { user: testUser };
    }
    throw new Error("Firebase not configured. Please set up Firebase credentials.");
  }
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithMicrosoft() {
  if (!auth) {
    // For development/testing when Firebase is not configured
    if (import.meta.env.DEV) {
      console.warn("Firebase not configured - using test user for development");
      return { user: testUser };
    }
    throw new Error("Firebase not configured. Please set up Firebase credentials.");
  }
  return signInWithPopup(auth, microsoftProvider);
}

export async function logOut() {
  if (!auth) {
    if (import.meta.env.DEV) return Promise.resolve();
    throw new Error("Firebase not configured");
  }
  return signOut(auth);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  if (!auth) {
    // In development mode without Firebase, check sessionStorage
    if (import.meta.env.DEV) {
      const stored = sessionStorage.getItem("devUser");
      if (stored) {
        callback(JSON.parse(stored) as FirebaseUser);
      } else {
        callback(null);
      }
      // Return no-op unsubscribe
      return () => {};
    }
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export type { FirebaseUser };
