// Firebase authentication setup for The Brotherhood
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

// In development mode, always use test auth (skip Firebase popup issues)
const isDev = import.meta.env.DEV;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is fully configured
export const isFirebaseConfigured = Boolean(
  !isDev && firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

// Test user for development
const createTestUser = () => ({
  uid: "test-user-123",
  email: "test@example.com",
  displayName: "Test User",
  photoURL: null,
  getIdToken: async () => "test-token-dev"
} as any);

export async function signInWithGoogle() {
  if (isDev) {
    // In development, always use test user - no Firebase popup
    console.log("Using test user for development");
    const testUser = createTestUser();
    sessionStorage.setItem("devUser", JSON.stringify(testUser));
    // Trigger auth state change
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("devAuthChange", { detail: testUser }));
    }, 0);
    return { user: testUser };
  }
  
  if (!auth) throw new Error("Firebase not configured");
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithMicrosoft() {
  if (isDev) {
    // In development, always use test user - no Firebase popup
    console.log("Using test user for development");
    const testUser = createTestUser();
    sessionStorage.setItem("devUser", JSON.stringify(testUser));
    // Trigger auth state change
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("devAuthChange", { detail: testUser }));
    }, 0);
    return { user: testUser };
  }
  
  if (!auth) throw new Error("Firebase not configured");
  return signInWithPopup(auth, microsoftProvider);
}

export async function logOut() {
  if (isDev) {
    sessionStorage.removeItem("devUser");
    window.dispatchEvent(new CustomEvent("devAuthChange", { detail: null }));
    return;
  }
  if (!auth) throw new Error("Firebase not configured");
  return signOut(auth);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  if (isDev) {
    // Check sessionStorage and listen for changes
    const checkAuth = () => {
      const stored = sessionStorage.getItem("devUser");
      if (stored) {
        const user = JSON.parse(stored);
        user.getIdToken = async () => "test-token-dev";
        callback(user);
      } else {
        callback(null);
      }
    };
    
    // Check immediately
    setTimeout(checkAuth, 0);
    
    // Listen for changes
    const handler = () => checkAuth();
    window.addEventListener("devAuthChange", handler);
    return () => window.removeEventListener("devAuthChange", handler);
  }
  
  if (!auth) {
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(auth, callback);
}

export type { FirebaseUser };
