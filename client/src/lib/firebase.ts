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
  try {
    if (!auth) {
      throw new Error("Auth not initialized");
    }
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    // Fall back to test user in dev mode
    if (import.meta.env.DEV) {
      console.warn("Firebase login failed, using test user for development", error);
      const testUser = createTestUser();
      sessionStorage.setItem("devUser", JSON.stringify(testUser));
      return { user: testUser };
    }
    throw error;
  }
}

export async function signInWithMicrosoft() {
  try {
    if (!auth) {
      throw new Error("Auth not initialized");
    }
    return await signInWithPopup(auth, microsoftProvider);
  } catch (error) {
    // Fall back to test user in dev mode
    if (import.meta.env.DEV) {
      console.warn("Firebase login failed, using test user for development", error);
      const testUser = createTestUser();
      sessionStorage.setItem("devUser", JSON.stringify(testUser));
      return { user: testUser };
    }
    throw error;
  }
}

export async function logOut() {
  try {
    if (!auth) {
      if (import.meta.env.DEV) {
        sessionStorage.removeItem("devUser");
        return;
      }
      throw new Error("Firebase not configured");
    }
    return await signOut(auth);
  } catch (error) {
    if (import.meta.env.DEV) {
      sessionStorage.removeItem("devUser");
      return;
    }
    throw error;
  }
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
      return () => {};
    }
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export type { FirebaseUser };
