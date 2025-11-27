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
const createTestUser = () => ({
  uid: "test-user-123",
  email: "test@example.com",
  displayName: "Test User",
  photoURL: null,
  getIdToken: async () => "test-token-development-only"
} as any);

export async function signInWithGoogle() {
  if (!auth) {
    // For development/testing when Firebase is not configured
    if (import.meta.env.DEV) {
      console.warn("Firebase not configured - using test user for development");
      const testUser = createTestUser();
      // Store for persistence
      sessionStorage.setItem("devUser", JSON.stringify(testUser));
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
      const testUser = createTestUser();
      // Store for persistence
      sessionStorage.setItem("devUser", JSON.stringify(testUser));
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
      setTimeout(() => {
        const stored = sessionStorage.getItem("devUser");
        if (stored) {
          try {
            const user = JSON.parse(stored);
            user.getIdToken = async () => "test-token-development-only";
            callback(user as FirebaseUser);
          } catch (e) {
            console.error("Failed to parse dev user:", e);
            callback(null);
          }
        } else {
          callback(null);
        }
      }, 0);
      // Return no-op unsubscribe
      return () => {};
    }
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export type { FirebaseUser };
