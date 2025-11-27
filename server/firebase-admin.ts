// Firebase Admin SDK for server-side token verification
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

let adminApp: App | null = null;

// Initialize Firebase Admin only if we have the required config
function initializeFirebaseAdmin(): App | null {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  
  // Check if we have Firebase config from environment
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    console.warn("Firebase Admin: VITE_FIREBASE_PROJECT_ID not set, token verification disabled");
    return null;
  }

  try {
    // Initialize with Application Default Credentials or just project ID
    // On Replit, we can use the project ID alone for token verification
    adminApp = initializeApp({
      projectId,
    });
    console.log("Firebase Admin initialized successfully");
    return adminApp;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return null;
  }
}

// Initialize on module load
adminApp = initializeFirebaseAdmin();

export async function verifyIdToken(idToken: string): Promise<DecodedIdToken | null> {
  if (!adminApp) {
    console.warn("Firebase Admin not initialized, skipping token verification");
    return null;
  }

  try {
    const auth = getAuth(adminApp);
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export function isFirebaseAdminInitialized(): boolean {
  return adminApp !== null;
}
